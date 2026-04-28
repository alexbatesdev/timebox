export const getDateProp = () =>
  import.meta.env.VITE_NOTION_DATE_PROP || "date";

export const getTitleProp = () =>
  import.meta.env.VITE_NOTION_TITLE_PROP || "Name";

export const getLooseEndsTitleProp = () =>
  import.meta.env.VITE_NOTION_LOOSE_ENDS_TITLE_PROP || "Name";

export const getLooseEndsDoneProp = () =>
  import.meta.env.VITE_NOTION_LOOSE_ENDS_DONE_PROP || "Done";
