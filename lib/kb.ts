import raw from "@/content/knowledge-base.json";

export type Lang = "ar" | "en";
export const LANGS: Lang[] = ["ar", "en"];
export type T = Record<Lang, string>;
export type LayerId = "nca" | "biz" | "pdpl";
export type ProfileId = "dev" | "product" | "supplier" | "shop";
export type GroupId = "nca" | "rec" | "biz" | "pdpl" | "profile";

export interface Item {
  id: string;
  group: GroupId;
  profile?: ProfileId;
  layers: LayerId[];
  /** Phase per profile: 1 = 30 days, 2 = 90 days, 3 = 6 months, 0 = not applicable. */
  phase: Partial<Record<ProfileId, 0 | 1 | 2 | 3>>;
  title: T;
  what: T;
}

export interface Profile {
  id: ProfileId;
  name: T;
  short: T;
  jewel: T;
  threat: T;
  driver: T;
}

export interface KnowledgeBase {
  version: string;
  updated: string;
  sources: { id: string; name: T; url: string }[];
  layers: Record<LayerId, T>;
  groups: { id: Exclude<GroupId, "profile">; title: T; sub: T }[];
  phases: { n: 1 | 2 | 3; title: T; sub: T }[];
  profiles: Profile[];
  items: Item[];
}

export const kb = raw as unknown as KnowledgeBase;

export function isLang(x: string): x is Lang {
  return (LANGS as string[]).includes(x);
}
