import { CategoryObject, OptionalCategory } from './category';
import { TagObject } from './tag';
import { UserObjectSlim } from './user';

export type TopicObject = {
  lastposttime: number | string;
  category: CategoryObject;
  user: UserObjectSlim;
  teaser: Teaser;
  tags: TagObject[];
  isOwner: boolean;
  ignored: boolean;
  unread: boolean;
  bookmark: number;
  unreplied: boolean;
  icons: string[];
  isAnon?: boolean | string;
  tid?: number;
  thumb?: string;
  pinExpiry?: number;
  pinExpiryISO?: string | number;
  index?: number;
  timestampISO?: string | number;
  scheduled?: boolean | string;
  uid: number;
  cid: number;
  title: string;
  slug: string;
  mainPid: number;
  postcount: string;
  viewcount: string;
  postercount: string;
  deleted: string;
  deleterUid: string;
  titleRaw: string;
  locked: string;
  pinned: number;
  timestamp: number;
  lastposttimeISO: number | string;
  upvotes: number;
  downvotes: number;
  votes: number;
  teaserPid: number | string;
  thumbs: Thumb[];
}

export type OptionalTopic = TopicObject | null;

export type OptionalTopicList = OptionalTopic[] | null;

export type TopicField =
  number | CategoryObject | UserObjectSlim | Teaser | boolean | number | string[] | TagObject[] | Thumb[] | null;


export interface TopicsWrapper {
  topics?: OptionalTopicList
}

export type TopicObjectCoreProperties = {
  lastposttime: number;
  category: CategoryObject;
  user: UserObjectSlim;
  teaser: Teaser;
  tags: TagObject[];
  isOwner: boolean;
  ignored: boolean;
  unread: boolean;
  bookmark: number;
  unreplied: boolean;
  icons: string[];
};

export type TopicObjectOptionalProperties = {
  tid: number;
  thumb: string;
  pinExpiry: number;
  pinExpiryISO: string;
  index: number;
  timestampISO: string;
  scheduled: boolean;
  isAnon: boolean;
};

interface Teaser {
  pid: number;
  uid: number;
  timestamp: number;
  tid: number;
  content: string;
  timestampISO: string;
  user: UserObjectSlim;
  index: number;
}

export type TopicObjectSlim = TopicSlimProperties & TopicSlimOptionalProperties;

export type TopicSlimProperties = {
  tid: number;
  uid: number;
  cid: number;
  title: string;
  slug: string;
  mainPid: number;
  postcount: string;
  viewcount: string;
  postercount: string;
  scheduled: string;
  deleted: string;
  deleterUid: string;
  titleRaw: string;
  locked: string;
  pinned: number;
  resolved: number;
  timestamp: string;
  timestampISO: number;
  lastposttime: string;
  lastposttimeISO: number;
  pinExpiry: number;
  pinExpiryISO: number;
  upvotes: string;
  downvotes: string;
  votes: string;
  teaserPid: number | string;
  thumbs: Thumb[];
};

export type Thumb = {
  id: number;
  name: string;
  url: string;
};

export type TopicSlimOptionalProperties = {
  tid: number;
  numThumbs: number;
};


export interface TopicMethods {
  getTopicsFields: (tids: number[], fields: string[]) => Promise<OptionalTopicList>;
  getTopicField: (tid: number, field: string) => Promise<TopicField>;
  getTopicFields: (tid: number, fields: string[]) => Promise<OptionalTopic>;
  getTopicData: (tid: number) => Promise<OptionalTopic>;
  getTopicsData: (tids: number[]) => Promise<OptionalTopicList>;
  getCategoryData: (tid: number) => Promise<OptionalCategory>;
  setTopicField: (tid: number, field: string, value: TopicField) => Promise<void>;
  setTopicFields: (tid: number, data: OptionalTopic) => Promise<void>;
  deleteTopicField: (tid: number, field: string) => Promise<void>;
  deleteTopicFields: (tid: number, fields: string[]) => Promise<void>;
}
