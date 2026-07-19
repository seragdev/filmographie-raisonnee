import { createContext, useContext } from 'react';

/** Global ⌘K search-overlay state ("The Catalog"). Provided once by Layout. */
export interface SearchCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

export const SearchContext = createContext<SearchCtx>({ open: false, setOpen: () => {}, toggle: () => {} });

export const useSearch = () => useContext(SearchContext);
