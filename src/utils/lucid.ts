// import { Lucid} from "https://unpkg.com/lucid-cardano@0.10.11/web/mod.js";
import { Lucid} from "lucid-cardano";


export const getLucid = () => {
  throw new Error("Please use Lucid from the useLucid hook instead of getLucid()");
};

// Add this helper function if you need it
export const getLucidInstance = (lucidFromContext: Lucid | null) => {
  if (!lucidFromContext) throw new Error("Lucid not initialized. Connect wallet first.");
  return lucidFromContext;
};