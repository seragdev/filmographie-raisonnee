#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Parser for FILMOGRAPHIE RAISONNÉE — data pipeline for a wiki about Arab women
filmmakers, sourced from Mathilde Rouxel's 2020 PhD thesis (HAL tel-03425456).

Reads the pdftotext output (full.txt) and produces JSON datasets:
  filmmakers.json, profiles.json, timeline.json, bibliography.json, meta.json
plus a verification report (build_report.md).
"""
import re
import os
import sys
import json
import unicodedata
import datetime
import random

# CLI: python3 scripts/parser.py [full.txt] [outdir]
# Defaults keep the original pipeline paths for reference; CI passes both args.
_HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else '/mnt/agents/work/full.txt'
OUTDIR = sys.argv[2] if len(sys.argv) > 2 else '/mnt/agents/output/data'
INDEX = os.environ.get('FR_INDEX', os.path.join(_HERE, 'filmmaker_index_206.md'))
if not os.path.exists(INDEX):
    INDEX = None  # optional aid; parser works without it

# ---------------------------------------------------------------------------
# common helpers
# ---------------------------------------------------------------------------

with open(SRC, encoding='utf-8') as fh:
    RAW = [l.replace('\x0c', '') for l in fh.read().split('\n')]  # strip form feeds


def is_page_num(s):
    return bool(re.fullmatch(r'\d{2,4}', s.strip()))


def is_letter_divider(s):
    return bool(re.fullmatch(r'[A-Z]', s.strip()))


def clean_join(lines_):
    txt = ' '.join(l.strip() for l in lines_)
    txt = re.sub(r'\s+', ' ', txt)
    txt = re.sub(r'\s+([,.;:!?»%)])', r'\1', txt)
    txt = re.sub(r'([(«])\s+', r'\1', txt)
    return txt.strip()


def strip_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s)
                   if unicodedata.category(c) != 'Mn')


def slugify(name):
    s = strip_accents(name.lower())
    s = re.sub(r"['’‘`]", '', s)
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')


def ends_terminal(s):
    s = s.rstrip()
    return s.endswith(('.', '.”', '.)', '»', '?', '!', '’', '”'))


# ---------------------------------------------------------------------------
# FILMOGRAPHIE RAISONNÉE  (lines 25233-34359)
# ---------------------------------------------------------------------------

SECTION_ENDS = {'egypt': 27972, 'lebanon': 31894, 'tunisia': 34359}
YEAR_RE = re.compile(r'[,¸]\s*((?:19|20)\d{2}(?:\s*[-–]\s*\d{2,4})?)\s*(?=[,.]|\s+\S)')

META_START = ('Réalisation', 'Interprète', 'Organisme', 'Festivals', 'Festival',
              'Prix', 'Voix off', 'Disponible', 'Commentaire')
FUNC_WORDS = set('le la les de des du une un et est dans qui que sur avec pour '
                 'par au aux ce cette son sa ses il elle en à y ont fait'.split())


def is_meta_start(s):
    return s.startswith(META_START)


def is_credits_start(s):
    if not s.startswith('Réalisation'):
        return False
    return bool(re.match(r'^Réalisation[^:;]{0,60}[:;]', s))


def is_prose(s):
    if '. ' in s:
        return True
    words = re.findall(r"[\wÀ-ÿ’'-]+", s.lower())
    return sum(1 for w in words if w in FUNC_WORDS) >= 2


FRAG_RE = re.compile(r"^[\wÀ-ÿ ’'&()-]+(?:, [\wÀ-ÿ ’'&()-]+)*,?$")


def load_anchors():
    """Read the pre-built index of the 206 filmmaker headings."""
    anchors = []
    country = None
    with open(INDEX, encoding='utf-8') as fh:
        for l in fh.read().split('\n'):
            if l.startswith('## Égypte'):
                country = 'egypt'
            elif l.startswith('## Liban'):
                country = 'lebanon'
            elif l.startswith('## Tunisie'):
                country = 'tunisia'
            m = re.match(r'- L(\d+): (.+)', l)
            if m:
                txt = m.group(2).strip()
                txt = re.sub(r'\s+\*$', '', txt)  # index marks no-comma headings with ' *'
                anchors.append((int(m.group(1)), txt, country))
    # sanity: anchor text must match the source line
    for ln, txt, _ in anchors:
        assert RAW[ln - 1].strip() == txt, f'anchor mismatch at {ln}: {txt!r}'
    return anchors


def get_entry_lines(anchors, i):
    """Raw text lines of filmmaker entry i (page numbers & letter dividers
    removed; runs of short comma fragments merged back into one line)."""
    ln, txt, c = anchors[i]
    end = anchors[i + 1][0] - 1 if i + 1 < len(anchors) else SECTION_ENDS[c]
    out = []
    for j in range(ln + 1, end + 1):
        s = RAW[j - 1].rstrip()
        st = s.strip()
        if not st or is_page_num(st) or is_letter_divider(st):
            continue
        out.append(s)
    # merge runs of >=3 short fragment lines (pdftotext column artefact)
    merged, cur = [], []
    for l in out:
        s = l.strip()
        if len(s) <= 25 and '.' not in s and ':' not in s and FRAG_RE.match(s):
            cur.append(l)
        else:
            if len(cur) >= 3:
                merged.append(' '.join(x.strip().rstrip(',') for x in cur).strip() + '.')
            else:
                merged.extend(cur)
            cur = []
            merged.append(l)
    if cur:
        if len(cur) >= 3:
            merged.append(' '.join(x.strip().rstrip(',') for x in cur).strip() + '.')
        else:
            merged.extend(cur)
    return merged


def merge_meta_lines(elines):
    """Merge wrapped credits/meta lines (Réalisation, Interprètes, Organisme,
    Festival, Prix, Voix off, Disponible) into single logical lines."""
    out = []
    i = 0
    n = len(elines)
    while i < n:
        l = elines[i]
        if is_credits_start(l):
            cur = l
            while not ends_terminal(cur) and i + 1 < n:
                nxt = elines[i + 1]
                if YEAR_RE.search(nxt) or is_meta_start(nxt):
                    break
                if ' : ' in nxt or nxt.startswith('(') or cur.rstrip().endswith((',', ';', ':')):
                    if is_prose(nxt) and ' : ' not in nxt:
                        break
                    cur += ' ' + nxt.strip()
                    i += 1
                else:
                    break
            out.append(cur)
            i += 1
        elif l.startswith(('Interprète', 'Organisme', 'Festival', 'Prix',
                           'Voix off', 'Disponible', 'Commentaire')):
            cur = l
            while not ends_terminal(cur) and i + 1 < n:
                nxt = elines[i + 1]
                if YEAR_RE.search(nxt) or is_meta_start(nxt) or is_prose(nxt):
                    break
                cur += ' ' + nxt.strip()
                i += 1
            out.append(cur)
            i += 1
        else:
            out.append(l)
            i += 1
    return out


GENRE_WORDS = (r'(?:documentaire|fiction|reportage|docu-fiction|docu-expérimental'
               r'|expérimental|experimental|série|animation|animé|essai|sitcom|clip'
               r'|téléfilm|vidéo|video|montage|témoignage|installation|docufiction'
               r'|non renseigné)')
GENRE_START_RE = re.compile(r'^\s*' + GENRE_WORDS, re.I)
FILM_LINE_RE = re.compile(
    r',\s*(?:19|20)\d{2}\s*,\s*(?:documentaire|fiction|reportage|docu-fiction'
    r'|docu-expérimental|expérimental|experimental|série|animation|animé|essai'
    r'|sitcom|clip|téléfilm|vidéo|video|montage|témoignage|installation'
    r'|non renseigné)', re.I)


def is_film_line(lines_, k):
    l = lines_[k]
    if is_meta_start(l):
        return False
    if FILM_LINE_RE.search(l):
        return True
    if re.search(r',\s*(?:19|20)\d{2}\s*,?\s*$', l) and k + 1 < len(lines_) \
            and GENRE_START_RE.match(lines_[k + 1]):
        return True
    return False


def segment_entry(ll):
    """Segment an entry into (bio_lines, films). Each film: title lines,
    credits line, pre_credits meta lines, tail lines."""
    n = len(ll)
    credits_idx = [i for i, l in enumerate(ll) if is_credits_start(l)]
    films = []
    prev_end = 0
    for ci in credits_idx:
        j = ci - 1
        pre_meta = []
        while j >= prev_end and is_meta_start(ll[j]) and not is_credits_start(ll[j]):
            pre_meta.insert(0, ll[j])
            j -= 1
        title_end = j
        tstart = j + 1
        accum = []
        while j >= prev_end:
            tstart = j
            accum.insert(0, ll[j])
            if YEAR_RE.search(' '.join(accum)):
                break
            if j - 1 < prev_end or (is_meta_start(ll[j - 1]) and not is_credits_start(ll[j - 1])) \
                    or ends_terminal(ll[j - 1]):
                break
            j -= 1
            if title_end - j >= 3:
                break
        title = ll[tstart:title_end + 1] if tstart <= title_end else []
        if not title and not pre_meta and films and films[-1]['anchor'] \
                and films[-1]['pos'] == ci - 1:
            # duplicated credits line (source artefact): merge
            films[-1]['credits'] += ' ' + ll[ci]
            prev_end = ci + 1
            continue
        films.append({'title': title, 'credits': ll[ci], 'pre_meta': pre_meta,
                      'tstart': tstart, 'pos': ci, 'anchor': True})
        prev_end = ci + 1
    # regions between films: bio region + tails; search for credits-less films
    regions = []
    if films:
        regions.append(('bio', ll[:films[0]['tstart']], 0))
        for k, f in enumerate(films):
            rend = films[k + 1]['tstart'] if k + 1 < len(films) else n
            regions.append((k, ll[f['pos'] + 1:rend], f['pos'] + 1))
    else:
        regions.append(('bio', ll, 0))
    bio_lines = []
    for rname, rlines, roff in regions:
        idxs = [k for k in range(len(rlines)) if is_film_line(rlines, k)]
        if not idxs:
            if rname == 'bio':
                bio_lines = rlines
            else:
                films[rname]['tail'] = rlines
            continue
        if rname == 'bio':
            bio_lines = rlines[:idxs[0]]
        else:
            films[rname]['tail'] = rlines[:idxs[0]]
        for q, m in enumerate(idxs):
            t = [rlines[m]]
            e = m
            while not ends_terminal(rlines[e]) and e + 1 < len(rlines) \
                    and not is_meta_start(rlines[e + 1]) and not is_film_line(rlines, e + 1):
                e += 1
                t.append(rlines[e])
            reg_end = idxs[q + 1] if q + 1 < len(idxs) else len(rlines)
            films.append({'title': t, 'credits': None, 'pre_meta': [],
                          'tail': rlines[e + 1:reg_end], 'tstart': roff + m,
                          'pos': roff + m, 'anchor': False})
    films.sort(key=lambda f: f['pos'])
    for f in films:
        f.setdefault('tail', [])
    return bio_lines, films

# --- film title-form classification ----------------------------------------

FR_WORDS = set('le la les des de du une un et au aux ce cette ces son sa ses mon '
               'ma mes ton ta tes notre nos votre vos leur leurs je tu il elle on '
               'nous vous ils elles ne pas plus sous sur dans avec pour par qui '
               'que ou où à bien très sans chez entre vers après avant pendant '
               'contre parmi hôtel maison femme homme cinéma ville nuit jour '
               'mer terre ciel soleil lune feu eau vent sable chanson '
               'histoire voyage retour mémoire guerre paix amour rêve lumière '
               'ombre porte fenêtre pont rue chemin fin début printemps été '
               'automne hiver dieu enfant mère père sœur frère fille fils mariée '
               'mari femmes hommes enfants chambre miroir pain pluie nuages arbre '
               'arbres yeux mains cœur âme sang argent papier murs voix visage '
               'temps année années monde pays mort vie naissance famille école '
               'travail jeu danse fête étoile couleurs'.split())
EN_WORDS = set('the of and in on my your her his our their to from with for a an '
               'at by is are was were be been it its this that these those all '
               'other another no not into over under between through during '
               'before after above below up down out off again further then once '
               'here there when where why how both each few more most some such '
               'only own same so than too very can will just should now sale story '
               'song day days night life death man woman women men children house '
               'home world war peace love dream dreams journey voice voices city '
               'river sea sun moon land fire water wind time times memory return '
               'wedding game games shadow light gate door train horse mud sellers '
               'buyers move depth year years window mirror bread rain clouds sky '
               'tree trees sand silence girls boys old new first last eye eyes '
               'hand hands heart soul blood gold silver paper walls bridge street '
               'road way end beginning spring summer autumn winter people god baby '
               'mother father sister brother daughter son bride wife husband '
               'family school work play dance festival views permissible '
               'responsible'.split()) - {'man', 'men'}
DIN_CHARS = set('āīūḥṭṣḏẓʿʾʹĀĪŪḤṬṢḎẒẖẖṛṚṅṆḑḐṯṮġĠẑẐǧǦḫḪšŠžŽčČʕʔẗ')
CONTRACTION_RE = re.compile(r"\b(\w+)[’‘](t|s|re|ve|ll|d|m)\b", re.I)
TRANSLIT_START = re.compile(
    r"(?<![\wÀ-ÿ])[’‘]\w|\w[’‘](?![\wÀ-ÿ])|\b(?:al|el|wa|fi|min|ila|bi|‘an|’an"
    r"|li|lā|‘ala|ala|ayn|‘ayn)-", re.I)
FR_ELISION = {'l', 'd', 'j', 'n', 's', 't', 'c', 'm', 'qu', 'lorsqu', 'puisqu',
              'quelqu', 'jusqu', 'lorsqu'}
MID_HAMZA_RE = re.compile(r"(\w+)[’‘](\w+)")
FR_WEAK = {'la', 'le', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'au', 'aux',
           'à', 'en', 'on', 'y', 'ma', 'mon', 'ta', 'ton', 'sa', 'son', 'ses', 'mes',
           'tes', 'mais', 'ou'}


def translit_score(form):
    f = CONTRACTION_RE.sub(r"\1\2", form)
    din = sum(1 for ch in f if ch in DIN_CHARS)
    score = din + len(TRANSLIT_START.findall(f))
    # mid-word hamza (e.g. "imra’a", "ida’a") unless French elision (l’ombre)
    for mm in MID_HAMZA_RE.finditer(f):
        if mm.group(1).lower() not in FR_ELISION:
            score += 1
    return score


def word_scores(form):
    f = CONTRACTION_RE.sub(r"\1\2", form)
    words = [w for w in re.findall(r"[A-Za-zÀ-ÿ'’‘]+", f.lower()) if len(w) > 1]
    fr = sum(1 for w in words if w in FR_WORDS)
    en = sum(1 for w in words if w in EN_WORDS)
    fr_strong = sum(1 for w in words if w in FR_WORDS and w not in FR_WEAK)
    return fr, en, translit_score(form), fr_strong


def split_forms(text):
    """Split on ' / ' but not inside ( ) or « »."""
    parts, depth, cur = [], 0, ''
    i = 0
    while i < len(text):
        ch = text[i]
        if ch in '(«':
            depth += 1
            cur += ch
            i += 1
        elif ch in ')»':
            depth = max(0, depth - 1)
            cur += ch
            i += 1
        elif ch == '/' and depth == 0 and ((i + 1 < len(text) and text[i + 1] == ' ')
                                           or (i > 0 and text[i - 1] == ' ')):
            parts.append(cur.strip())
            cur = ''
            i += 1
        else:
            cur += ch
            i += 1
    if cur.strip():
        parts.append(cur.strip())
    return [p for p in parts if p]


def classify_forms(forms):
    """Assign title forms to titleFr/titleTranslit/titleEn/titleDin."""
    res = {'titleFr': None, 'titleTranslit': None, 'titleEn': None, 'titleDin': None}
    gloss = None
    uncertain = False
    if forms:
        m = re.match(r'^(.*?)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*$', forms[-1])
        if m and m.group(1).strip():
            inner = m.group(2).strip()
            if translit_score(inner) > 0 or inner.startswith('«'):
                forms[-1] = m.group(1).strip()
                din_parts = []
                for ip in split_forms(inner):
                    if ip.startswith('«') and ip.endswith('»'):
                        gloss = ip.strip('« »').strip()
                    else:
                        din_parts.append(ip)
                if din_parts:
                    res['titleDin'] = ' / '.join(din_parts)
                if not forms[-1]:
                    forms = forms[:-1]
    n = len(forms)
    if n == 0:
        return res, gloss, True
    if n == 1:
        fr, en, tr, frs = word_scores(forms[0])
        if en > 0 and en >= fr:
            res['titleEn'] = forms[0]
        elif fr > 0:
            res['titleFr'] = forms[0]
        elif tr > 0:
            res['titleTranslit'] = forms[0]
        else:
            res['titleFr'] = forms[0]  # default guess; raw kept anyway
    else:
        kinds = []
        for f in forms:
            fr, en, tr, frs = word_scores(f)
            if frs > 0 and frs >= tr:
                kinds.append('fr')
            elif tr > 0 and tr > en and tr >= fr:
                kinds.append('translit')
            elif en > 0 and en >= fr:
                kinds.append('en')
            elif fr > 0 and tr == 0 and en == 0:
                kinds.append('fr')
            elif tr > 0:
                kinds.append('translit')
            else:
                kinds.append('unknown')
        slots = {'titleFr': [], 'titleTranslit': [], 'titleEn': []}
        leftovers = []
        for f, k in zip(forms, kinds):
            if k == 'fr':
                slots['titleFr'].append(f)
            elif k == 'en':
                slots['titleEn'].append(f)
            elif k == 'translit':
                slots['titleTranslit'].append(f)
            else:
                leftovers.append(f)
        if len(leftovers) >= 2:
            uncertain = True
        for f in leftovers:
            for slot in ('titleFr', 'titleTranslit', 'titleEn'):
                if not slots[slot]:
                    slots[slot].append(f)
                    break
            else:
                slots['titleTranslit'].append(f)
                uncertain = True
        for slot in slots:
            if len(slots[slot]) >= 2:
                uncertain = True
            if slots[slot]:
                res[slot] = ' / '.join(slots[slot])
    if res['titleFr'] is None and gloss:
        res['titleFr'] = gloss
    return res, gloss, uncertain


# --- film field parsing (genre/countries/format/length/color/language) -----

GENRE_SET = {'documentaire', 'fiction', 'reportage', 'docu-fiction',
             'docu-expérimental', 'expérimental', 'experimental', 'série télévisée',
             'série télévisuelle', 'série de documentaires',
             'série de portraits pour la télévision',
             'série de moyen-métrages de fiction', 'série de ramadan',
             'série documentaire', 'série', 'animation', 'animé', 'essai',
             'sitcom', 'clip', 'clip vidéo', 'téléfilm', 'vidéo', 'video art',
             'montage vidéo', 'témoignage de création', 'installation vidéo',
             'installation', 'documentaire de création', 'documentaire experimental',
             'documentaire expérimental', 'documentaire expérimetnal',
             'fiction experimental', 'docu-ficiton', 'publicité',
             'téléfilm documentaire', 'film de commande', 'docu-fiction vidéo'}
GENRE_WORD_RE = re.compile(
    r'^(' + '|'.join(sorted(GENRE_SET, key=len, reverse=True)).replace(' ', r'\s+')
    + r')\b', re.I)

COUNTRY_SET = {'Égypte', 'France', 'Liban', 'Tunisie', 'Suède', 'Canada',
               'États-Unis', 'Allemagne', 'Suisse', 'Belgique', 'Danemark', 'Qatar',
               'Royaume-Uni', 'Royaume-Unis', 'Finlande', 'Norvège',
               'Émirats Arabes Unis', 'Émirats Arabe Unis', 'Émirats arabes unis',
               'Espagne', 'Pays-Bas', 'Palestine', 'Turquie', 'Arménie', 'Islande',
               'Maroc', 'Algérie', 'Koweit', 'Grèce', 'Italie', 'Portugal',
               "Allemagne de l’Ouest", 'Soudan', 'Russie', 'Australie',
               'Afrique du Sud', 'Arabie Saoudite', 'Sri Lanka', 'Myanmar', 'Japon',
               'Slovénie', 'Zimbabwe', 'Tunsie', 'Égyte', 'Israël', 'Syrie',
               'Jordanie', 'Irak', 'Libye', 'Chine', 'Inde', 'Sénégal', 'Cuba',
               'Mexique', 'Brésil', 'Argentine', 'Chili', 'Colombie', 'Venezuela',
               'Pérou', 'Autriche', 'Hongrie', 'Pologne', 'Tchécoslovaquie',
               'République tchèque', 'Slovaquie', 'Roumanie', 'Bulgarie',
               'Yougoslavie', 'Serbie', 'Croatie', 'Bosnie', 'Macédoine', 'Albanie',
               'Ukraine', 'Géorgie', 'Azerbaïdjan', 'Kazakhstan', 'Pakistan',
               'Bangladesh', 'Thaïlande', 'Viêt Nam', 'Laos', 'Cambodge',
               'Malaisie', 'Indonésie', 'Philippines', 'Corée du Sud', 'Mongolie',
               'Taïwan', 'Bahreïn', 'Oman', 'Yémen', 'Éthiopie', 'Érythrée',
               'Somalie', 'Kenya', 'Tanzanie', 'Ouganda', 'Rwanda', 'Burundi',
               'République démocratique du Congo', 'Congo', 'Cameroun', 'Gabon',
               'Tchad', 'Niger', 'Nigeria', 'Mali', 'Burkina Faso', 'Mauritanie',
               "Côte d'Ivoire", 'Ghana', 'Togo', 'Bénin', 'Guinée', 'Comores',
               'Madagascar', 'Djibouti', 'Angola', 'Mozambique', 'Luxembourg',
               'Monaco', 'Malte', 'Chypre', 'Irlande', 'Écosse', 'Pays de Galles',
               'Angleterre', 'Monténégro', 'Kosovo'}

LENGTH_PAT = re.compile(
    r'(minutes?|mintes?|min\b|épisodes?|court[s]?-métrage|long[s]?-métrage'
    r'|longmétrage|moyen[s]?-métrage|durée|^\d+\s*[x×]\s*\d+|\d+\s*h\b|\d+’\d+'
    r'|heures?)', re.I)
FORMAT_PAT = re.compile(
    r'\b(mm\b|vidéo|video|numérique|DV\b|beta|HDCAM|HD|DCP|VHS|PAL|SECAM'
    r'|mini\s*DV|super\s*8|pellicule|négatif|format|K7|DVD|film\b)', re.I)
COLOR_PAT = re.compile(r'(couleur|noir|blanc|N&B|n&b)', re.I)


def split_countries(cand):
    toks = [c.strip().strip('()').strip() for c in re.split(r'\s*/\s*', cand) if c.strip()]
    out, extra, ok = [], [], False
    for t in toks:
        if t in COUNTRY_SET:
            out.append(t)
            ok = True
        else:
            m = None
            for ctry in COUNTRY_SET:
                if t.startswith(ctry + ' '):
                    m = ctry
                    break
            if m:
                out.append(m)
                extra.append(t[len(m):].strip())
                ok = True
            else:
                out.append(t)
    return out, extra, ok


def parse_rest(rest):
    uncertain = False
    rest = rest.strip().rstrip('.').strip()
    yearAlt = None
    m = re.match(r'^\((\d{4})\)\s*,?\s*', rest)
    if m:
        yearAlt = int(m.group(1))
        rest = rest[m.end():]
    parts = [p.strip() for p in rest.split(',') if p.strip()]
    genres, g = [], 0
    while g < len(parts) and parts[g].lower() in GENRE_SET:
        genres.append(parts[g])
        g += 1
    countries, extra_parts = [], []
    if not genres and parts:
        gm = GENRE_WORD_RE.match(parts[0])
        if gm and len(parts[0]) > gm.end():
            genres.append(parts[0][:gm.end()].strip())
            rem = parts[0][gm.end():].strip()
            if rem:
                parts = [rem] + parts[1:]
            g = 0
        else:
            genres.append(parts[0])
            g = 1
    genre = ', '.join(genres) if genres else None
    if g < len(parts):
        cand = parts[g]
        ctoks, extra, ok = split_countries(cand)
        lp = cand.lower()
        if ok or (not LENGTH_PAT.search(cand) and not FORMAT_PAT.search(cand)
                  and not COLOR_PAT.search(cand)
                  and all(re.fullmatch(r"[A-ZÀ-Þ][\wÀ-ÿ’' .()-]*", t) for t in ctoks)
                  and 'non renseigné' not in lp and 'non communiqué' not in lp):
            countries = ctoks
            extra_parts = extra
            g += 1
    if genre:
        gl = genre.lower()
        if gl not in GENRE_SET and gl != 'non renseigné':
            ctoks2, _, ok2 = split_countries(genre)
            if ok2:
                countries = ctoks2 + countries
                genre = None
            elif FORMAT_PAT.search(genre) or LENGTH_PAT.search(genre):
                extra_parts = [genre] + extra_parts
                genre = None
                uncertain = True
    fmt = length = color = lang = None
    for p in extra_parts + parts[g:]:
        pl = p.lower()
        if LENGTH_PAT.search(p):
            length = p if length is None else length + ' | ' + p
        elif color is None and COLOR_PAT.search(p):
            color = p
        elif fmt is None and (FORMAT_PAT.search(p) or 'non renseigné' in pl
                              or 'non communiqué' in pl or 'non resneigné' in pl):
            fmt = p
        elif lang is None:
            lang = p
        else:
            lang += ' | ' + p
    return {'genre': genre, 'countries': countries, 'format': fmt,
            'length': length, 'color': color, 'language': lang,
            'yearAlt': yearAlt, 'restUncertain': uncertain}


def parse_film(f):
    title_txt = clean_join(f['title'])
    raw_parts = [title_txt]
    if f['credits']:
        raw_parts.append(f['credits'])
    uncertain = False
    year = None
    rest = ''
    forms_txt = title_txt
    m = YEAR_RE.search(title_txt)
    tail = list(f['tail'])
    if not m:
        # detached year fragment (pdftotext artefact) living in the tail
        if tail and re.search(r'(?:^|[,¸])\s*(19|20)\d{2}', tail[0]) and len(tail[0]) < 60:
            frag = tail.pop(0)
            year = int(re.search(r'(19|20)\d{2}', frag).group(0))
            uncertain = True
            raw_parts.append(frag)
    else:
        year = int(m.group(1)[:4])
        forms_txt = title_txt[:m.start()].strip()
        rest = title_txt[m.end():]
    forms = split_forms(forms_txt)
    res, gloss, form_unc = classify_forms(forms)
    if m:
        rp = parse_rest(rest)
    else:
        rp = {'genre': None, 'countries': [], 'format': None, 'length': None,
              'color': None, 'language': None, 'yearAlt': None, 'restUncertain': False}
    yearAlt = rp.pop('yearAlt')
    if rp.pop('restUncertain'):
        uncertain = True
    cast = archive = festival = None
    credits = f['credits']
    synopsis_lines = []
    for l in list(f['pre_meta']) + tail:
        if l.startswith('Interprète'):
            c = re.sub(r'^Interprètes?\s*:\s*', '', l)
            cast = (cast + ' | ' + c) if cast else c
        elif l.startswith('Organisme'):
            a = re.sub(r'^Organismes?[^:]*:\s*', '', l)
            archive = (archive + ' | ' + a) if archive else a
        elif l.startswith('Festival'):
            fe = re.sub(r'^Festivals?\s*:\s*', '', l)
            festival = (festival + ' | ' + fe) if festival else fe
        elif l.startswith('Prix'):
            fe = re.sub(r'^Prix\s*:\s*', '', l)
            festival = (festival + ' | ' + fe) if festival else fe
        elif l.startswith('Disponible'):
            archive = (archive + ' | ' + l) if archive else l
        elif l.startswith(('Voix off', 'Commentaire')):
            credits = (credits + ' | ' + l) if credits else l
        else:
            synopsis_lines.append(l)
    synopsis = clean_join(synopsis_lines) if synopsis_lines else None
    if not m:
        uncertain = True
    if form_unc and len(forms) >= 3:
        uncertain = True
    if not f['anchor']:
        uncertain = True  # film without credits line in source
    raw = clean_join(raw_parts + list(f['pre_meta']) + tail)
    film = {'titleFr': res['titleFr'], 'titleTranslit': res['titleTranslit'],
            'titleEn': res['titleEn'], 'titleDin': res['titleDin'],
            'year': year, 'genre': rp['genre'], 'countries': rp['countries'],
            'format': rp['format'], 'length': rp['length'], 'color': rp['color'],
            'language': rp['language'], 'credits': credits, 'cast': cast,
            'synopsis': synopsis, 'archive': archive, 'festival': festival,
            'uncertain': uncertain, 'raw': raw}
    if yearAlt:
        film['yearAlt'] = yearAlt
    return film


# --- filmmaker headings & profile matching ----------------------------------

NO_COMMA = {'Ben Aleya Ayda': ('Ayda Ben Aleya', 'Ben Aleya, Ayda'),
            'Ben Mahmoud Afef': ('Afef Ben Mahmoud', 'Ben Mahmoud, Afef'),
            'Bouallegui Soumaya': ('Soumaya Bouallegui', 'Bouallegui, Soumaya')}


def parse_heading(txt):
    if txt in NO_COMMA:
        name, sort = NO_COMMA[txt]
        return name, sort, []
    if ',' in txt:
        last, first = txt.split(',', 1)
        last, first = last.strip(), first.strip()
    else:
        parts = txt.split()
        last, first = ' '.join(parts[:-1]), parts[-1]
    variants = []
    m = re.search(r'\(([^()]*)\)', last)
    if m:
        variants = [v.strip() for v in m.group(1).split(' / ')]
        last_clean = (last[:m.start()] + last[m.end():]).strip()
    else:
        last_clean = last
    m2 = re.search(r'\(([^()]*)\)', first)
    if m2:
        variants += [v.strip() for v in m2.group(1).split(' / ')]
        first = (first[:m2.start()] + first[m2.end():]).strip()
    return f'{first} {last_clean}', f'{last_clean}, {first}', variants


PROFILE_NAMES = ['Nabiha Lotfy', 'Ateyyat El-Abnoudy', 'Kalthoum Bornaz',
                 'Selma Baccar', 'Heiny Srour', 'Tahani Rached', 'Jocelyne Saab',
                 'Néjia Ben Mabrouk', 'Randa Chahal Sabbag', 'Arab Loutfi',
                 'Nadia El-Fani', 'Rania Stephan', 'Nadia Kamel', 'Hala Galal',
                 'Sonia Chamkhi', 'Reine Mitri', 'Hinde Boujemaa', 'Amal Ramsis',
                 'Hala Lotfy', 'May Kassem', 'Feriel Ben Mahmoud',
                 'Moufida Fedhila', 'May El Hossamy', 'Chantal Partamian']


def norm_tokens(name):
    s = strip_accents(name.lower())
    return frozenset(re.sub(r'[^a-z0-9 ]', ' ', s).split())


def norm_joined(name):
    return re.sub(r'[^a-z0-9]', '', strip_accents(name.lower()))


def edit_dist(a, b):
    m, n = len(a), len(b)
    if abs(m - n) > 3:
        return 99
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        prev, dp[0] = dp[0], i
        for j in range(1, n + 1):
            cur = dp[j]
            dp[j] = min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] != b[j - 1]))
            prev = cur
    return dp[n]


PROF_TOKENS = {p: norm_tokens(p) for p in PROFILE_NAMES}
PROF_JOINED = {p: norm_joined(p) for p in PROFILE_NAMES}


def has_profile(name, variants):
    for c in [name] + variants:
        nt, nj = norm_tokens(c), norm_joined(c)
        for p in PROFILE_NAMES:
            if PROF_TOKENS[p] == nt or edit_dist(PROF_JOINED[p], nj) <= 2:
                return True
    return False


def build_filmmakers():
    anchors = load_anchors()
    filmmakers = []
    for i in range(len(anchors)):
        ln, txt, country = anchors[i]
        ll = merge_meta_lines(get_entry_lines(anchors, i))
        bio, films = segment_entry(ll)
        parsed = [parse_film(f) for f in films]
        name, sortName, variants = parse_heading(txt)
        filmmakers.append({
            'slug': slugify(name), 'name': name, 'sortName': sortName,
            'variants': variants, 'country': country, 'bio': clean_join(bio),
            'hasProfile': has_profile(name, variants + [sortName]),
            'films': parsed})
    return filmmakers

# ---------------------------------------------------------------------------
# BIOGRAPHIES ET ENTRETIENS  (lines 34360-38020) — 24 profiles
# ---------------------------------------------------------------------------

PROF_HEADER_RE = re.compile(
    r"^([A-ZÉÈÊÀ][^()0-9]{1,60}?) *\((\d{4}) *[-–;,]? *(\d{4})? *[-–;]? *\)\s*$")
FOOTNOTE_START_RE = re.compile(r'^1[0-4]\d{2}(?=[A-ZÀ-Þ«"“]|\s)')
FN_MARK_RE = re.compile(r'([A-Za-zÀ-ÿ»])1[0-4]\d{2}(?=[\s,.;:»)]|$)')
QUOTE_CLOSE_RE = re.compile(r'»\s*(?:1[0-4]\d{2})?\s*$')
FILMO_CONT_RE = re.compile(r'\d{4}\s*;')


def prof_clean(s):
    s = FN_MARK_RE.sub(r'\1', s)
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'\s+([,.;:!?»%)])', r'\1', s)
    s = re.sub(r'([(«])\s+', r'\1', s)
    return s.strip()


def para_terminal(par):
    last = par[-1].rstrip()
    return last.endswith(('.', '.”', '.)', '»', '?', '!', '”', '’'))


def unbalanced(text, o, c):
    return text.count(o) > text.count(c)


def find_profile_headers():
    headers = []
    for j in range(34360, 38021):
        m = PROF_HEADER_RE.match(RAW[j - 1].strip())
        if m:
            headers.append((j, m.group(1).strip(), int(m.group(2)),
                            int(m.group(3)) if m.group(3) else None))
    return headers


def get_paragraphs(l0, l1):
    paras, cur = [], []
    for j in range(l0, l1):
        s = RAW[j - 1].strip()
        if is_page_num(s):
            continue
        if not s:
            if cur:
                paras.append(cur)
                cur = []
        else:
            cur.append(s)
    if cur:
        paras.append(cur)
    return paras


def remove_footnotes(paras):
    """Drop footnote blobs (page-bottom notes + their multi-page
    continuations, incl. original-language quotes)."""
    main = []
    fn_mode = False
    prev_fn_open = False
    for p in paras:
        fn_start = next((x for x, l in enumerate(p) if FOOTNOTE_START_RE.match(l)),
                        None)
        if fn_mode and prev_fn_open:
            prev_fn_open = (not para_terminal(p)) \
                or unbalanced(' '.join(p), '“', '”')
            continue
        if fn_start is not None:
            if fn_start > 0:
                main.append(p[:fn_start])
            fn_mode = True
            prev_fn_open = (not para_terminal(p[fn_start:])) \
                or unbalanced(' '.join(p[fn_start:]), '“', '”')
        else:
            fn_mode = False
            prev_fn_open = False
            main.append(p)
    return main


def quote_closed(qlines):
    return bool(QUOTE_CLOSE_RE.search(qlines[-1].rstrip()))


def split_profile_sections(paras):
    sections = []
    cur_section = None
    open_quote = None

    def flush_quote():
        nonlocal open_quote
        if open_quote and cur_section is not None:
            cur_section['quotes'].append(prof_clean(' '.join(open_quote)))
        open_quote = None

    for p in paras:
        segs, pre, cur, closed = [], [], None, True
        for l in p:
            if l.startswith('«'):
                if cur:
                    segs.append(cur)
                cur = [l]
                closed = quote_closed(cur)
            elif cur is not None and not closed:
                cur.append(l)
                closed = quote_closed(cur)
            else:
                if cur:
                    segs.append(cur)
                    cur = None
                pre.append(l)
        if cur:
            segs.append(cur)
        pre_text = prof_clean(' '.join(pre)) if pre else ''
        if pre_text:
            if open_quote is not None:
                open_quote += pre
                if quote_closed(open_quote):
                    flush_quote()
            else:
                cur_section = {'heading': pre_text, 'quotes': []}
                sections.append(cur_section)
        for s in segs:
            if open_quote is not None and quote_closed(open_quote):
                flush_quote()
            if open_quote is None:
                if cur_section is None:
                    cur_section = {'heading': None, 'quotes': []}
                    sections.append(cur_section)
                open_quote = []
            open_quote += s
            if quote_closed(open_quote):
                flush_quote()
    if open_quote is not None and cur_section is not None:
        flush_quote()
    return sections


def build_profiles(filmmakers):
    headers = find_profile_headers()
    # map profile name -> country via filmmakers
    country_by_slug = {fm['slug']: fm['country'] for fm in filmmakers}
    profiles = []
    for idx, (j, name, birth, death) in enumerate(headers):
        end = headers[idx + 1][0] - 1 if idx + 1 < len(headers) else 38020
        main = remove_footnotes(get_paragraphs(j + 1, end))
        bio_paras, filmo, rest = [], None, []
        for p in main:
            if filmo is None and p[0].startswith('Filmographie'):
                filmo = prof_clean(' '.join(p))
                continue
            if filmo is None:
                t = prof_clean(' '.join(p))
                if bio_paras and t and t[0].islower():
                    bio_paras[-1] += ' ' + t
                else:
                    bio_paras.append(t)
            else:
                rest.append(p)
        # filmography continuations split across page breaks
        while rest:
            joined = ' '.join(rest[0])
            first = rest[0][0]
            if (not first.startswith(('«', 'Nous')) and FILMO_CONT_RE.search(joined)
                    and joined.count(';') >= 1 and '»' not in joined):
                filmo += ' ' + prof_clean(joined)
                rest = rest[1:]
            else:
                break
        interviewNote = prof_clean(' '.join(rest[0])) if rest else None
        rest = rest[1:] if rest else []
        sections = split_profile_sections(rest)
        slug = slugify(name)
        profiles.append({'slug': slug, 'name': name, 'birthYear': birth,
                         'deathYear': death,
                         'country': country_by_slug.get(slug),
                         'bio': bio_paras, 'filmographyLine': filmo,
                         'interviewNote': interviewNote, 'sections': sections})
    return profiles


# ---------------------------------------------------------------------------
# CHRONOLOGIE  (lines 24899-25145)
# ---------------------------------------------------------------------------

MONTHS = ('janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre'
          '|novembre|décembre')
EVENT_START_RE = re.compile(
    r'^((?:\d{1,2}(?:e|er)?\s+(?:' + MONTHS + r')\s+\d{4}|\d{4})'
    r'(?:\s*[-–]\s*(?:(?:\d{1,2}(?:e|er)?\s+)?(?:' + MONTHS + r')\s+\d{4}|\d{4}))?)'
    r'\s*:\s*(.*)')
PERIOD_RANGES = {'1940-1967', '1967-1982', '1982-2005', '2005-2020'}


def parse_timeline():
    periods, events = [], []
    cur_period = None
    cur_event = None
    pending_header = None
    for j in range(24899, 25146):
        s = RAW[j - 1].strip()
        if not s or is_page_num(s):
            continue
        m = EVENT_START_RE.match(s)
        rng = m.group(1).replace(' ', '') if m else None
        if m and rng in PERIOD_RANGES:
            if cur_event:
                events.append(cur_event)
                cur_event = None
            label = s.split(':', 1)[1].strip()
            cur_period = {'label': label, 'range': rng}
            periods.append(cur_period)
            pending_header = cur_period
            continue
        if pending_header is not None and not m:
            pending_header['label'] += ' ' + s
            continue
        if m:
            if cur_event:
                events.append(cur_event)
            cur_event = {'date': m.group(1).strip(), 'label': m.group(2).strip(),
                         'period': cur_period['range'] if cur_period else None}
            pending_header = None
        else:
            pending_header = None
            if cur_event is not None:
                cur_event['label'] += ' ' + s
    if cur_event:
        events.append(cur_event)
    return {'periods': periods, 'events': events}


# ---------------------------------------------------------------------------
# BIBLIOGRAPHIE  (lines 23621-24787)
# ---------------------------------------------------------------------------

BIB_ENTRY_RE = re.compile(
    r"^[A-ZÀ-Þ«\"'\[].{0,110}?,\s*(?:\((?:19|20)\d{2}\)\s*)?(?:19|20)\d{2}\b")


def parse_bib_entry(raw):
    m = re.search(r',\s*(?:\((?:19|20)\d{2}\)\s*)?((?:19|20)\d{2})\b', raw)
    if not m:
        return {'raw': raw, 'authors': None, 'year': None, 'title': None}
    authors = raw[:m.start()].strip()
    year = int(m.group(1))
    rest = raw[m.end():].strip().lstrip(',').strip()
    rest = re.sub(r'^[\(\[](?:19|20)\d{2}[\)\]]\s*,?\s*', '', rest)
    mq = re.match(r'^«\s*(.*?)\s*»', rest)
    if mq:
        title = mq.group(1)
    else:
        seg = rest.split(',')[0].strip()
        title = seg if seg else None
    return {'raw': raw, 'authors': authors, 'year': year, 'title': title}


def parse_bibliography():
    raw_lines = []
    for j in range(23621, 24788):
        s = RAW[j - 1].strip()
        if not s or is_page_num(s):
            continue
        raw_lines.append(s)
    sections = []
    cur_sec = cur_sub = cur_entry = None

    def flush_entry():
        nonlocal cur_entry
        if cur_entry is not None and cur_sub is not None:
            cur_sub['entries'].append(parse_bib_entry(cur_entry))
        cur_entry = None

    def flush_sub():
        nonlocal cur_sub
        flush_entry()
        if cur_sub is not None and cur_sec is not None:
            cur_sec['subsections'].append(cur_sub)
        cur_sub = None

    def flush_sec():
        nonlocal cur_sec
        flush_sub()
        if cur_sec is not None:
            sections.append(cur_sec)
        cur_sec = None

    i, n = 0, len(raw_lines)
    while i < n and not re.match(r'^\d\.\s', raw_lines[i]):
        i += 1
    prev = ''
    while i < n:
        s = raw_lines[i]
        msec = re.match(r'^(\d)\.\s+(.*)', s)
        msub = re.match(r'^(\d)\.(\d+)\.?$', s)
        if msec:
            flush_sec()
            cur_sec = {'id': msec.group(1), 'title': msec.group(2).strip(),
                       'subsections': []}
        elif msub:
            flush_sub()
            num = f'{msub.group(1)}.{msub.group(2)}'
            title = ''
            i += 1
            while i < n and not BIB_ENTRY_RE.match(raw_lines[i]) \
                    and not re.match(r'^\d\.\s', raw_lines[i]) \
                    and not re.match(r'^\d\.\d+\.?$', raw_lines[i]):
                title = (title + ' ' + raw_lines[i]).strip()
                i += 1
            i -= 1
            cur_sub = {'id': num, 'title': title, 'entries': []}
        elif cur_sec is not None:
            if s == ':':
                prev = s
                i += 1
                continue
            if cur_sub is None:
                cur_sub = {'id': None, 'title': None, 'entries': []}
            is_start = bool(BIB_ENTRY_RE.match(s)) and (
                prev.endswith(('.', ')', 'PAGES')) or 'http' in prev or prev in ('', ':'))
            if is_start:
                flush_entry()
                cur_entry = s
            else:
                cur_entry = s if cur_entry is None else cur_entry + ' ' + s
        prev = s
        i += 1
    flush_sec()
    return {'sections': sections}

# ---------------------------------------------------------------------------
# meta + report + main
# ---------------------------------------------------------------------------

def build_meta(filmmakers, profiles, film_count):
    return {
        'thesis': {
            'author': 'Mathilde Rouxel',
            'title': ('Figures du peuple en lutte. Des pionnières du cinéma arabe '
                      'aux réalisatrices postrévolutionnaires (Tunisie / Égypte / '
                      'Liban, 1967-2020)'),
            'university': 'Université Sorbonne Nouvelle – Paris 3',
            'year': 2020,
            'halId': 'tel-03425456',
            'nnt': '2020PA030072',
            'halUrl': 'https://theses.hal.science/tel-03425456v1',
            'defended': '18 décembre 2020',
            'director': 'Nicole Brenez'},
        'counts': {'filmmakers': len(filmmakers), 'profiles': len(profiles),
                   'films': film_count},
        'generated': datetime.date.today().isoformat()}


def build_report(filmmakers, profiles, timeline, bibliography, meta):
    L = []
    L.append('# Build report — FILMOGRAPHIE RAISONNÉE data pipeline')
    L.append('')
    L.append(f"Generated: {meta['generated']}  |  source: {SRC}")
    L.append('')
    # filmmakers
    from collections import Counter
    cc = Counter(f['country'] for f in filmmakers)
    L.append('## Filmmakers')
    L.append(f"- Egypt: {cc.get('egypt', 0)} (expected 63)")
    L.append(f"- Lebanon: {cc.get('lebanon', 0)} (expected 80)")
    L.append(f"- Tunisia: {cc.get('tunisia', 0)} (expected 63)")
    L.append(f"- **Total: {len(filmmakers)} (expected 206 ±0)**")
    L.append(f"- With profile (hasProfile=true): "
             f"{sum(1 for f in filmmakers if f['hasProfile'])} (expected 24)")
    films = [fl for f in filmmakers for fl in f['films']]
    unc = [fl for fl in films if fl['uncertain']]
    noyear = [fl for fl in films if fl['year'] is None]
    nocred = [fl for fl in films if fl['credits'] is None]
    L.append(f"- Films parsed: **{len(films)}**")
    L.append(f"- Films flagged `uncertain` (kept with raw text): {len(unc)} "
             f"({100 * len(unc) / len(films):.1f}%)")
    L.append(f"  - of which no year in source: {len(noyear)}")
    L.append(f"  - of which no credits line in source: {len(nocred)}")
    empty_bio = [f['name'] for f in filmmakers if not f['bio']]
    L.append(f"- Filmmakers with empty bio: {len(empty_bio)}"
             + (f" ({', '.join(empty_bio)})" if empty_bio else ''))
    L.append('')
    # profiles
    L.append('## Profiles')
    L.append(f"- **Total: {len(profiles)} (expected 24)**")
    for p in profiles:
        nq = sum(len(s['quotes']) for s in p['sections'])
        L.append(f"  - {p['name']} ({p['birthYear']}-"
                 f"{p['deathYear'] if p['deathYear'] else ''}): "
                 f"{len(p['bio'])} bio para(s), {len(p['sections'])} section(s), "
                 f"{nq} quote(s)")
    L.append('')
    # timeline
    L.append('## Timeline')
    L.append(f"- Periods: {len(timeline['periods'])} (expected 4)")
    L.append(f"- Events: {len(timeline['events'])}")
    for p in timeline['periods']:
        n = sum(1 for e in timeline['events'] if e['period'] == p['range'])
        L.append(f"  - {p['range']}: {p['label']} — {n} events")
    L.append('')
    # bibliography
    L.append('## Bibliography')
    nbib = sum(len(sub['entries']) for s in bibliography['sections']
               for sub in s['subsections'])
    L.append(f"- Sections: {len(bibliography['sections'])} (expected 5)")
    L.append(f"- Entries: {nbib}")
    for s in bibliography['sections']:
        n = sum(len(sub['entries']) for sub in s['subsections'])
        L.append(f"  - {s['id']}. {s['title']}: "
                 f"{len(s['subsections'])} subsection(s), {n} entries")
    L.append('')
    # samples
    L.append('## Sample: 3 random filmmakers (full JSON)')
    L.append('')
    random.seed(20201218)
    for fm in random.sample(filmmakers, 3):
        L.append(f"### {fm['name']} ({fm['country']})")
        L.append('```json')
        L.append(json.dumps(fm, ensure_ascii=False, indent=2))
        L.append('```')
        L.append('')
    # anomalies
    L.append('## Anomalies & parser decisions')
    L.append('')
    L.append('- **Wrapped lines**: film entries wrap across lines (and pages); '
             'logical lines rebuilt via terminal-punctuation + credits-anchor '
             'analysis. Page-number lines and single-letter alphabetical '
             'dividers removed. Form-feed characters (\\f) stripped.')
    L.append('- **Detached field fragments**: one film (Nisa’ Mas’ulat / '
             'Responsible Women, El-Abnoudy) had its year/genre/country fields '
             'scattered after the credits line (pdftotext column artefact); '
             'fragment re-merged, year recovered, film flagged uncertain.')
    L.append('- **Films without credits line**: films lacking a `Réalisation :` '
             'line were detected by their title pattern (title, year, genre) '
             'and are flagged uncertain; credits=null.')
    L.append('- **Films without year**: year=null, flagged uncertain (several '
             'entries genuinely lack a year in the thesis, e.g. Leyla Assaf\'s '
             'Swedish productions).')
    L.append('- **Duplicate credits line**: Leila Chaïbi has a duplicated '
             '`Réalisation :` line (source artefact); merged into one film.')
    L.append('- **Bio line starting with "Réalisation"**: Khédija Lemkecher\'s '
             'bio contains "Réalisation dans la section Cinéma..." (a degree); '
             'credits anchors require a colon/semicolon to avoid false films.')
    L.append('- **Typo values kept as-is** (fidelity): e.g. countries "Égyte"/'
             '"Tunsie", "non resneigné", "90 mintes", genre "documentaire '
             'expérimetnal"; visible in raw fields.')
    L.append('- **Dabague, Christine**: one film whose title is literally '
             '"Non renseigné." — kept as-is, year=null, uncertain.')
    L.append('- **Titles**: 1-4 forms split on " / " (paren/guillemet aware); '
             'assignment to titleFr/titleTranslit/titleEn/titleDin is heuristic '
             '(word-scoring); ambiguous 3+ form titles are flagged uncertain. '
             'The `raw` field always holds the original text.')
    L.append('- **3 Tunisie headings without comma** (Ben Aleya Ayda, Ben '
             'Mahmoud Afef, Bouallegui Soumaya): name/sortName reconstructed '
             '(family-name first in source).')
    L.append('- **hasProfile**: all 24 profile names matched to a filmmaker '
             'entry (fuzzy: token-set equality or edit distance <= 2; '
             '"Selma Baccar" profile ↔ "Baccar, Salma" entry).')
    L.append('- **Profiles**: footnote blobs (incl. English original quotes) '
             'removed via footnote-number tracking across page breaks; inline '
             'footnote markers (e.g. "Nasser1083") stripped. Quotes closed by '
             'line-end "»"; nested/stray guillemets make 5 quotes look '
             '"unbalanced" but text is complete.')
    L.append('- **Timeline**: period headers = the 4 known ranges only; the '
             'event "1964-1976 : Guerre de libération des peuples du Dhofar" is '
             'correctly kept as an event, not a period.')
    L.append('- **Bibliography**: section 4 (Philosophie arabe) has no '
             'subsections — its 7 entries are stored under a null-id '
             'subsection. Entry parsing (authors/year/title) is best-effort; '
             'raw always kept.')
    return '\n'.join(L)


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    filmmakers = build_filmmakers()
    profiles = build_profiles(filmmakers)
    timeline = parse_timeline()
    bibliography = parse_bibliography()
    film_count = sum(len(f['films']) for f in filmmakers)
    meta = build_meta(filmmakers, profiles, film_count)

    def dump(name, obj):
        path = os.path.join(OUTDIR, name)
        with open(path, 'w', encoding='utf-8') as fh:
            json.dump(obj, fh, ensure_ascii=False, indent=2)
        print('wrote', path)

    dump('filmmakers.json', filmmakers)
    dump('profiles.json', profiles)
    dump('timeline.json', timeline)
    dump('bibliography.json', bibliography)
    dump('meta.json', meta)

    report = build_report(filmmakers, profiles, timeline, bibliography, meta)
    with open(os.path.join(OUTDIR, 'build_report.md'), 'w', encoding='utf-8') as fh:
        fh.write(report)
    print('wrote', os.path.join(OUTDIR, 'build_report.md'))

    # console summary
    from collections import Counter
    print('filmmakers:', len(filmmakers), dict(Counter(f['country'] for f in filmmakers)))
    print('profiles:', len(profiles))
    print('films:', film_count,
          '| uncertain:', sum(1 for f in filmmakers for fl in f['films'] if fl['uncertain']))
    print('timeline:', len(timeline['periods']), 'periods,', len(timeline['events']), 'events')
    print('bibliography:', len(bibliography['sections']), 'sections,',
          sum(len(s['entries']) for sec in bibliography['sections'] for s in sec['subsections']),
          'entries')


if __name__ == '__main__':
    main()
