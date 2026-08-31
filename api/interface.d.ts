/**
 * @fileoverview KuGouMusicApi TypeScript type definitions
 *
 * Flat function export structure auto-generated from module/ files,
 * each API maps to a standalone exported function with matching parameter and return types.
 *
 * Export structure references app.js:
 * module.exports = { ...require('./server'), ...require('./util/request'), ...obj };
 */

// ============================================================
//  Basic Common Types
// ============================================================

/** Cookie key-value map */
export interface CookieMap {
  [key: string]: string;
}

/** Base request parameters shared by all API endpoints */
export interface CommonParams {
  /**
   * User authentication cookie
   * - Supports string format (e.g. `"token=xxx;userid=xxx;dfid=xxx"`)
   * - Supports object format (e.g. `{ token: "xxx", userid: "xxx" }`)
   */
  cookie?: string | CookieMap;
  /** Timestamp to bypass 2-minute cache (makes each request URL unique) */
  timestamp?: number | string;
  /** Whether to prevent writing response cookies back to the client */
  noCookie?: boolean;
}

/** Unified API response structure */
export interface ApiResponse<T = any> {
  /** HTTP status code */
  status: number;
  /** Response body (JSON format) */
  body: T;
  /** Response headers */
  headers: Record<string, string>;
  /** Cookies set by the server */
  cookie?: string[];
}

/** Common paginated request parameters */
export interface PaginatedParams extends CommonParams {
  /** Page number */
  page?: number;
  /** Items per page, default 30 */
  pagesize?: number;
}

/** Common error response body */
export interface ErrorBody {
  /** Error code */
  code: number;
  /** Data (usually null) */
  data: null;
  /** Error message */
  msg: string;
}

// ============================================================
//  Enums / Union Literal Types
// ============================================================

/**
 * Music quality types
 *
 * - `piano`: Magic Music - Piano
 * - `acappella`: Magic Music - Acapella (returns mkv with vocal and instrumental tracks)
 * - `subwoofer`: Magic Music - Bone Flute
 * - `ancient`: Magic Music - Ukulele
 * - `surnay`: Magic Music - Suona
 * - `dj`: Magic Music - DJ
 * - `128`：128kbps MP3
 * - `320`：320kbps MP3
 * - `flac`: FLAC lossless
 * - `high`: Lossless format
 * - `viper_atmos`: Viper Atmos
 * - `viper_clear`: Viper Ultra HD
 * - `viper_tape`: Viper Master (transcoding required)
 * - `super`: DSD format (rarely supported)
 */
export type SongQuality =
  | 'piano'
  | 'acappella'
  | 'subwoofer'
  | 'ancient'
  | 'surnay'
  | 'dj'
  | '128'
  | '320'
  | 'flac'
  | 'high'
  | 'viper_atmos'
  | 'viper_clear'
  | 'viper_tape'
  | 'super';

/** Search type */
export type SearchType = 'song' | 'special' | 'lyric' | 'album' | 'author' | 'mv';

/** Whether lyric search returns multiple results */
export type LyricMan = 'yes' | 'no';

/** Comment sort direction */
export type CommentSort = 1 | 2;

/** Personal FM fetch mode */
export type FmMode = 'normal' | 'small' | 'peak';

/** Personal FM action type */
export type FmAction = 'play' | 'garbage';

/** Personal FM AI recommendation pool */
export type FmSongPoolId = 0 | 1 | 2;

/** Song recommendation card_id (Standard Edition) */
export type CardId = 1 | 2 | 3 | 4 | 5 | 6;

/** Song recommendation card_id (Concept Edition) */
export type YouthCardId = 3001 | 3004 | 3005 | 3006 | 3014 | 3101;

/** New album release region type */
export type AlbumType = 1 | 2 | 3 | 4;

/** Artist gender type */
export type ArtistSexType = 0 | 1 | 2 | 3;

/** Artist region type */
export type ArtistRegionType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Artist MV tag type */
export type ArtistVideoTag = 'official' | 'live' | 'fan' | 'artist' | 'all';

/** Artist sort order */
export type ArtistSort = 'hot' | 'new';

/** Scene music discussion sort order */
export type SceneSort = 'rec' | 'hot' | 'new';

/** Audio related version sort order */
export type AudioRelatedSort = 'all' | 'hot' | 'new';

/** Playlist action type: 0 = create playlist, 1 = favorite playlist */
export type PlaylistAddType = 0 | 1;

/** Sheet music type */
export type SheetOpernType = 0 | 1 | 2 | 3 | 98 | 99;

/** Sheet music collection position */
export type SheetCollectionPosition = 2 | 3 | 4;

/** Platform device type */
export type Platform = 'ios' | 'android';

/** Editor's picks data type */
export type IpDataType = 'audios' | 'albums' | 'videos' | 'author_list';

/** Listening history type: 0 = last week, 1 = all-time cumulative */
export type ListenType = 0 | 1;

/** History recommendation mode */
export type HistoryMode = 'list' | 'song';

/** Optional album info fields */
export type AlbumField =
  | 'trans_param'
  | 'special_tag'
  | 'authors'
  | 'album_name'
  | 'publish_date'
  | 'cover'
  | 'intro'
  | 'publish_company'
  | 'type'
  | 'album_id'
  | 'language_id'
  | 'is_publish'
  | 'heat'
  | 'grade'
  | 'quality'
  | 'exclusive'
  | 'grade_count'
  | 'author_name'
  | 'sizable_cover'
  | 'language'
  | 'category';

/** Optional krm/audio endpoint fields */
export type KrmAudioField = 'album_info' | 'authors.base' | 'base' | 'audio_info' | 'authors.ip' | 'extra' | 'tags' | 'tagmap';

/** Followed artist new songs sort: 1 = time, 2 = affinity */
export type FollowNewSongsSort = 1 | 2;

/** Optional song MV fields */
export type MvField = 'mkv' | 'tags' | 'h264' | 'h265' | 'authors';

// ============================================================
//  Request Parameter Types — Login & Authentication
// ============================================================

/** Phone number login parameters */
export interface LoginCellphoneParams extends CommonParams {
  /** Phone number (required) */
  mobile: string;
  /** Verification code from `/captcha/sent` (required) */
  code: string;
  /** User id; required when the user has multiple accounts */
  userid?: string;
}

/** Username login parameters */
export interface LoginParams extends CommonParams {
  /** Username (required) */
  username: string;
  /** Password (required); recommend encodeURIComponent encoding or POST request */
  password: string;
}

/** WeChat Open Platform login parameters */
export interface LoginOpenplatParams extends CommonParams {
  /** Code generated after successful WeChat QR scan (required) */
  code: string;
}

/** QQ OAuth login parameters */
export interface LoginQqParams extends CommonParams {
  /** Openid returned by QQ OAuth (required) */
  openid: string;
  /** Access token returned by QQ OAuth (required) */
  access_token: string;
}

/** QR code key generation parameters */
export interface LoginQrKeyParams extends CommonParams {}

/** QR code generation parameters */
export interface LoginQrCreateParams extends CommonParams {
  /** Key generated by `/login/qr/key` (required) */
  key: string;
  /** When provided, also returns QR code image as base64 */
  qrimg?: string | boolean;
}

/** QR code scan status check parameters */
export interface LoginQrCheckParams extends CommonParams {
  /** Key generated by `/login/qr/key` (required) */
  key: string;
}

/** WeChat QR code generation parameters */
export interface LoginWxCreateParams extends CommonParams {}

/** WeChat QR code scan status check parameters */
export interface LoginWxCheckParams extends CommonParams {
  /** UUID generated by `/login/wx/create` (required) */
  uuid: string;
  /** Recommended to avoid cache-induced delay */
  timestamp?: number | string;
}

/** QQ QR code generation parameters */
export interface LoginQqQrCreateParams extends CommonParams {}

/** QQ QR code scan status check parameters */
export interface LoginQqQrCheckParams extends CommonParams {
  /** QQ scan session cookie returned by `/login/qq/qr/create` (required) */
  cookie: string | CookieMap;
  /** qrsig generated by `/login/qq/qr/create` (required) */
  qrsig: string;
  /** hash33 value of qrsig, returned by `/login/qq/qr/create` (required) */
  ptqrtoken: string | number;
  /** QQ login signature, returned by `/login/qq/qr/create` (required) */
  pt_login_sig: string;
  /** Full xlogin params (incl. h5sig), returned by `/login/qq/qr/create` (required) */
  pt_openlogin_data: string;
  /** Full xlogin URL, used as polling Referer (required) */
  xlogin_url: string;
  /** Recommended to avoid cache-induced delay */
  timestamp?: number | string;
}

/** Refresh login parameters */
export interface LoginTokenParams extends CommonParams {
  /** Token obtained after login */
  token?: string;
  /** User id */
  userid?: string;
}

// ============================================================
//  Request Parameter Types — Captcha & Device
// ============================================================

/** Send verification code parameters */
export interface CaptchaSentParams extends CommonParams {
  /** Phone number (required) */
  mobile: string;
}

/** dfid retrieval parameters */
export interface RegisterDevParams extends CommonParams {}

/** Get verification info parameters */
export interface GetVerifyInfoParams extends CommonParams {
  /** Verification event ID (required) */
  eventid: string;
  /** User id */
  userid?: string;
  /** Platform id, default 2 */
  platid?: number;
}

/** Submit verification code parameters */
export interface VerifyUserInfoParams extends CommonParams {
  /** Verification event ID (required) */
  eventid: string;
  /** Verification type: 23 = Tencent captcha, 32 = phone verification code */
  v_type?: number;
  /** Verification code data (required) */
  verifycode: string;
  /** RSA-encrypted AES key (from get_verify_info or sidedt) */
  sid?: string;
  /** AES-encrypted behavior data (from get_verify_info or sidedt) */
  edt?: string;
  /** User id */
  userid?: string;
  /** Platform id, default 2 */
  platid?: number;
}

/** Get device list parameters */
export interface LoginDeviceParams extends CommonParams {
  /** User id */
  userid?: string;
}

/** Log out specific device parameters */
export interface LoginDeviceKickParams extends CommonParams {
  /** User token */
  token?: string;
  /** Device mid */
  mid?: string;
}

/** Get sid/edt parameters */
export interface SidedtParams extends CommonParams {
  /** User id */
  userid?: string;
  /** Device fingerprint ID */
  dfid?: string;
  /** Device MID */
  mid?: string;
}

// ============================================================
//  Request Parameter Types — User Info
// ============================================================

/** Get user extra info parameters */
export interface UserDetailParams extends CommonParams {}

/** Get user VIP info parameters */
export interface UserVipDetailParams extends CommonParams {}

/** Get user playlists parameters */
export interface UserPlaylistParams extends PaginatedParams {}

/** Get user followed artists parameters */
export interface UserFollowParams extends CommonParams {}

/** Get followed artist messages parameters */
export interface UserFollowMessageParams extends CommonParams {
  /** Artist/user userid (required) */
  id: string;
  /** Items per page, default 30 */
  pagesize?: number;
}

/** Get user cloud drive parameters */
export interface UserCloudParams extends PaginatedParams {}

/** Get user cloud music URL parameters */
export interface UserCloudUrlParams extends CommonParams {
  /** Music hash (required) */
  hash: string;
  /** Album id */
  album_id?: string;
  /** Cloud music name */
  name?: string;
  /** Album audio id */
  album_audio_id?: string;
}

/** Delete user cloud music parameters */
export interface UserCloudDelParams extends CommonParams {
  /** Cloud file ID; multiple values comma-separated */
  fileid?: number | string;
  /** Cloud file ID list */
  fileids?: Array<number | string> | string;
  /** Cloud file ID alias */
  kv_id?: number | string;
  /** Album audio ID; list endpoint returns album_audio_id */
  album_audio_id?: number | string;
  /** Album audio ID list */
  album_audio_ids?: Array<number | string> | string;
  /** album_audio_id alias */
  mix_id?: number | string;
  /** album_audio_id alias */
  mixid?: number | string;
  /** Override client version; defaults to current platform config */
  clientver?: number | string;
  /** Override appid; defaults to current platform config */
  appid?: number | string;
}

/** Pre-upload cloud library matching parameters */
export interface UserCloudMatchParams extends CommonParams {
  /** File hash (MD5); multiple comma-separated; auto-computed from request body if omitted */
  hash?: string;
  /** File hash alias */
  filename?: string;
  /** Album audio ID; aids matching when available */
  album_audio_id?: number | string;
  /** Album audio ID list */
  album_audio_ids?: Array<number | string> | string;
  /** album_audio_id alias */
  mix_id?: number | string;
  /** album_audio_id alias */
  mixid?: number | string;
  /** Override client version; defaults to current platform config */
  clientver?: number | string;
  /** Override appid; defaults to current platform config */
  appid?: number | string;
}

/** Upload music to user cloud parameters */
export interface UserCloudUploadParams extends CommonParams {
  /** File hash (MD5); auto-computed from request body by default */
  filename?: string;
  /** File extension, default mp3 */
  extendname?: string;
  /** Cloud music display name */
  name?: string;
  /** Track name; used to build display name when name is omitted */
  track_name?: string;
  /** Track name alias */
  songname?: string;
  /** Artist name */
  author_name?: string;
  /** Library standard hash; auto-matched by default if omitted */
  hash_std?: string;
  /** Audio id; auto-matched by default if omitted */
  audio_id?: number | string;
  /** Album audio id; auto-matched by default if omitted */
  album_audio_id?: number | string;
  /** album_audio_id alias */
  mix_id?: number | string;
  /** album_audio_id alias */
  mixid?: number | string;
  /** Auto-match library, default 1; pass 0/false/no to disable */
  auto_match?: number | string | boolean;
  /** Bitrate type, default 4 */
  bitrate?: number | string;
  /** Duration in milliseconds */
  timelen?: number | string;
  /** Cloud list version, default 0 */
  list_ver?: number | string;
  /** Override client version; defaults to current platform config */
  clientver?: number | string;
  /** Override appid; defaults to current platform config */
  appid?: number | string;
}

/** Get user collected videos parameters */
export interface UserVideoCollectParams extends PaginatedParams {}

/** Get user liked videos parameters */
export interface UserVideoLoveParams extends CommonParams {
  /** Items per page, default 30 */
  pagesize?: number;
}

/** Get user listening history ranking parameters */
export interface UserListenParams extends CommonParams {
  /**
   * Fetch type
   * - 0: Top 120 songs from the last week
   * - 1: Top 120 songs all-time cumulative
   */
  type?: ListenType;
}

/** Get user recent listening history parameters */
export interface UserHistoryParams extends CommonParams {
  /** Pass value from previous response for pagination */
  bp?: string;
}

/** Get continue playing info parameters */
export interface LastestSongsListenParams extends CommonParams {
  /** Items per page, default 30 */
  pagesize?: number;
}

/** Get user activity feed parameters */
export interface YouthDynamicParams extends CommonParams {}

/** Earn VIP by listening parameters */
export interface YouthListenSongParams extends CommonParams {
  /** Album track id (album_audio_id/MixSongID) */
  mixsongid?: number | string;
}

// ============================================================
//  Request Parameter Types — Playlist Management
// ============================================================

/** Favorite / create playlist parameters */
export interface PlaylistAddParams extends CommonParams {
  /** Playlist name (required) */
  name: string;
  /** Playlist creator userid (required) */
  list_create_userid: string;
  /** Playlist listid (required) */
  list_create_listid: string;
  /** Privacy setting: 0 = public, 1 = private (create playlist only) */
  is_pri?: 0 | 1;
  /**
   * Action type
   * - 0: Create playlist (default)
   * - 1: Favorite playlist
   */
  type?: PlaylistAddType;
  /** Playlist list_create_gid */
  list_create_gid?: string;
}

/** Unfavorite / delete playlist parameters */
export interface PlaylistDelParams extends CommonParams {
  /** User playlist listid (required) */
  listid: string;
}

/** Add songs to playlist parameters */
export interface PlaylistTracksAddParams extends CommonParams {
  /** User playlist listid (required) */
  listid: string;
  /**
   * Song data (required)
   * Format: `track_name|song_hash|album_id|(mixsongid/album_audio_id)`
   * Requires at least track name and hash; multiple values comma-separated
   */
  data: string;
}

/** Remove songs from playlist parameters */
export interface PlaylistTracksDelParams extends CommonParams {
  /** User playlist listid (required) */
  listid: string;
  /** Song fileid in playlist; comma-separated (required) */
  fileids: string;
}

/** Get playlist categories parameters */
export interface PlaylistTagsParams extends CommonParams {}

/** Get playlist list parameters */
export interface TopPlaylistParams extends CommonParams {
  /**
   * Category tag (required)
   * - 0: Recommended
   * - 11292：HI-RES
   * - Other values from `/playlist/tags` endpoint
   */
  category_id: number;
  /** Return partial song list: 0 = no, 1 = yes */
  withsong?: 0 | 1;
  /** Return playlist categories: 0 = no, 1 = yes */
  withtag?: 0 | 1;
}

/** Get theme playlist parameters */
export interface ThemePlaylistParams extends CommonParams {}

/** Get sound-effect playlist parameters */
export interface PlaylistEffectParams extends PaginatedParams {}

/** Get playlist detail parameters */
export interface PlaylistDetailParams extends CommonParams {
  /** Playlist global_collection_id; comma-separated (required) */
  ids: string;
}

/** Get all playlist songs parameters */
export interface PlaylistTrackAllParams extends PaginatedParams {
  /** Playlist global_collection_id (required) */
  id: string;
}

/** Get all playlist songs (new version) parameters */
export interface PlaylistTrackAllNewParams extends PaginatedParams {
  /** Playlist listid (required) */
  listid: string;
}

/** Get similar playlists parameters */
export interface PlaylistSimilarParams extends CommonParams {
  /** Playlist global_collection_id; comma-separated (required) */
  ids: string;
}

// ============================================================
//  Request Parameter Types — Album
// ============================================================

/** New album releases parameters */
export interface TopAlbumParams extends PaginatedParams {
  /** Region type: 1 = Chinese, 2 = Western, 3 = Japan, 4 = Korea; empty by default */
  type?: AlbumType;
}

/** Album info parameters */
export interface AlbumParams extends CommonParams {
  /** Album id; comma-separated (required) */
  album_id: string;
  /** Fields to return; comma-separated */
  fields?: string;
}

/** Album detail parameters */
export interface AlbumDetailParams extends CommonParams {
  /** Album id (required) */
  id: string;
}

/** Album track list parameters */
export interface AlbumSongsParams extends PaginatedParams {
  /** Album id (required) */
  id: string;
}

/** Record store parameters */
export interface AlbumShopParams extends CommonParams {}

// ============================================================
//  Request Parameter Types — Music / Songs
// ============================================================

/** Get music URL parameters */
export interface SongUrlParams extends CommonParams {
  /** Music hash (required) */
  hash: string;
  /** Album id */
  album_id?: string;
  /** Return preview portion (some songs only) */
  free_part?: boolean | string;
  /** Album audio id */
  album_audio_id?: string;
  /** Quality type */
  quality?: SongQuality;
}

/** Get music URL (new version) parameters */
export interface SongUrlNewParams extends CommonParams {
  /** Music hash (required) */
  hash: string;
  /** Album audio id */
  album_audio_id?: string;
  /** Return preview portion (some songs only) */
  free_part?: boolean | string;
}

/** Get song climax section parameters */
export interface SongClimaxParams extends CommonParams {
  /** Music hash; comma-separated (required) */
  hash: string;
}

/** Get music related info parameters */
export interface AudioParams extends CommonParams {
  /** Song hash; comma-separated (required) */
  hash: string;
}

/** Get more music versions parameters */
export interface AudioRelatedParams extends CommonParams {
  /** Music mixsongid / album_audio_id (required) */
  album_audio_id: string;
  /** Page number */
  page?: number;
  /** Items per page, default 30 */
  pagesize?: number;
  /** Whether to return categories */
  show_type?: boolean | string;
  /** Sort: all / hot / new */
  sort?: AudioRelatedSort;
  /** Category */
  type?: string;
  /**
   * Whether to return details
   * - 0: Return count only
   * - Omit or other values: Return details
   */
  show_detail?: 0 | 1;
}

/** Get music accompaniment info parameters */
export interface AudioAccompanyMatchingParams extends CommonParams {
  /** Music hash (required) */
  hash: string;
  /** Music file name (required) */
  fileName: string;
  /** Music mixsongid / album_audio_id (required) */
  mixid: string;
}

/** Get music karaoke count parameters */
export interface AudioKtvTotalParams extends CommonParams {
  /** Music songid from `/audio/accompany/matching` (required) */
  songId: string;
  /** Artist name(s); multiple separated by `、` (required) */
  singerName: string;
  /** Music hash from `/audio/accompany/matching` (required) */
  songHash: string;
}

/** Get music detail parameters */
export interface PrivilegeLiteParams extends CommonParams {
  /** Song hash; comma-separated (required) */
  hash: string;
}

/** Get music album/artist info parameters */
export interface KrmAudioParams extends CommonParams {
  /** Album track id (album_audio_id/MixSongID); comma-separated (required) */
  album_audio_id: string;
  /** Return fields; comma-separated */
  fields?: string;
}

// ============================================================
//  Request Parameter Types — Search
// ============================================================

/** Search parameters */
export interface SearchParams extends CommonParams {
  /** Search keywords (required) */
  keywords: string;
  /** Page number */
  page?: number;
  /** Items per page, default 30 */
  pagesize?: number;
  /** Search type; default is songs */
  type?: SearchType;
}

/** Default search keywords parameters */
export interface SearchDefaultParams extends CommonParams {}

/** Complex search parameters */
export interface SearchComplexParams extends PaginatedParams {
  /** Search keywords (required) */
  keywords: string;
}

/** Hot search list parameters */
export interface SearchHotParams extends CommonParams {}

/** Search suggestions parameters */
export interface SearchSuggestParams extends CommonParams {
  /** Search keywords (required) */
  keywords: string;
  /** Number of albums to return */
  albumTipCount?: number;
  /** Number of playlists to return (estimated) */
  correctTipCount?: number;
  /** Number of MVs to return */
  mvTipCount?: number;
  /** Number of songs to return */
  musicTipCount?: number;
}

/** Lyric search parameters */
export interface SearchLyricParams extends CommonParams {
  /** Search keywords; one of keywords or hash (required) */
  keywords?: string;
  /** Song hash; one of keywords or hash (required) */
  hash?: string;
  /** Album track id */
  album_audio_id?: string;
  /** Song duration */
  duration?: number | string;
  /** Return multiple lyrics: yes = multiple, no = one (default) */
  man?: LyricMan;
}

/** Get lyrics parameters */
export interface LyricParams extends CommonParams {
  /** Lyric id from `/search/lyric` (required) */
  id: string;
  /** Lyric accesskey from `/search/lyric` (required) */
  accesskey: string;
  /** Lyric type: lrc = standard, krc = word-by-word */
  fmt?: 'lrc' | 'krc';
  /** Decode lyrics when provided */
  decode?: boolean | string;
}

/** Mixed search parameters */
export interface SearchMixedParams extends CommonParams {
  /** Search keywords (required) */
  keyword: string;
}

// ============================================================
//  Request Parameter Types — Theme Music
// ============================================================

/** Get all theme playlist songs parameters */
export interface ThemePlaylistTrackParams extends CommonParams {
  /** Theme playlist id (required) */
  theme_id: string;
}

/** Get theme music parameters */
export interface ThemeMusicParams extends CommonParams {}

/** Get theme music detail parameters */
export interface ThemeMusicDetailParams extends CommonParams {
  /** Theme music id (required) */
  id: string;
}

// ============================================================
//  Request Parameter Types — Song Recommendations
// ============================================================

/** Song recommendation parameters (Standard Edition) */
export interface TopCardParams extends CommonParams {
  /**
   * Recommendation type (required)
   * - 1: Curated picks / Personal favorites
   * - 2: Classic nostalgia hits
   * - 3: Popular song picks
   * - 4: Hidden gem tracks
   * - 5: Unknown
   * - 6: VIP exclusive recommendations
   */
  card_id: CardId;
}

/** Song recommendation parameters (Concept Edition) */
export interface TopCardYouthParams extends CommonParams {
  /**
   * Recommendation type (required)
   * - 3001: Personal favorites
   * - 3004: Hidden gem tracks
   * - 3005: Trending new releases
   * - 3006: VIP exclusive recommendations
   * - 3014: Listeners who liked this also liked
   * - 3101: Concept Edition new releases
   */
  card_id: YouthCardId;
  /** Items per page, default 30 */
  pagesize?: number;
}

/** Genre blind box parameters (Concept Edition) */
export interface TopTagCardYouthParams extends CommonParams {}

// ============================================================
//  Request Parameter Types — Images
// ============================================================

/** Get artist and album images parameters */
export interface ImagesParams extends CommonParams {
  /** Song hash; comma-separated (required) */
  hash: string;
  /** Album id; comma-separated */
  album_id?: string;
  /** Album track id; comma-separated */
  album_audio_id?: string;
  /** Max images to return, default 5 */
  count?: number;
}

/** Get artist images parameters */
export interface ImagesAudioParams extends CommonParams {
  /** Song hash; comma-separated (required) */
  hash: string;
  /** Music id; comma-separated */
  audio_id?: string;
  /** Album track id; comma-separated */
  album_audio_id?: string;
  /** Music file name; comma-separated */
  filename?: string;
  /** Max images to return, default 5 */
  count?: number;
}

// ============================================================
//  Request Parameter Types — Personal FM
// ============================================================

/** Personal FM parameters */
export interface PersonalFmParams extends CommonParams {
  /** Music hash (recommended) */
  hash?: string;
  /** Music songid (recommended) */
  songid?: string;
  /** Played duration (recommended) */
  playtime?: number | string;
  /**
   * Fetch mode, default normal
   * - normal: Discover
   * - small: Niche
   * - peak：30s
   */
  mode?: FmMode;
  /**
   * Action type, default play
   * - play: Play
   * - garbage: Dislike
   */
  action?: FmAction;
  /**
   * AI recommendation pool
   * - 0: Alpha taste-based recommendations
   * - 1: Beta style-based recommendations
   * - 2：Gamma
   */
  song_pool_id?: FmSongPoolId;
  /** Whether playback is complete */
  is_overplay?: boolean | string;
  /** Remaining unplayed songs, default 0; no recommendations when > 4 (recommended) */
  remain_songcnt?: number;
}

// ============================================================
//  Request Parameter Types — Banner / Music Library
// ============================================================

/** Banner carousel parameters */
export interface PcDiantaiParams extends CommonParams {}

/** Music library banner parameters */
export interface YuekuBannerParams extends CommonParams {}

/** Music library radio parameters */
export interface YuekuFmParams extends CommonParams {}

/** Music library parameters */
export interface YuekuParams extends CommonParams {}

// ============================================================
//  Request Parameter Types — Radio
// ============================================================

/** Radio category parameters */
export interface FmClassParams extends CommonParams {}

/** Recommended radio parameters */
export interface FmRecommendParams extends CommonParams {}

/** Radio image parameters */
export interface FmImageParams extends CommonParams {
  /** fmid; comma-separated (required) */
  fmid: string;
}

/** Radio music list parameters */
export interface FmSongsParams extends CommonParams {
  /** fmid; comma-separated (required) */
  fmid: string;
  /** fmtype; comma-separated */
  fmtype?: string;
  /** Song offset; comma-separated */
  fmoffset?: string;
  /** Song list size; comma-separated */
  fmsize?: string;
}

// ============================================================
//  Request Parameter Types — Editor's Picks
// ============================================================

/** Editor's picks parameters */
export interface TopIpParams extends CommonParams {}

/** Editor's picks data parameters */
export interface IpParams extends PaginatedParams {
  /** ip id (required) */
  id: string;
  /** Data type */
  type?: IpDataType;
}

/** Editor's picks detail parameters */
export interface IpDateilParams extends CommonParams {
  /** ip id; comma-separated (required) */
  id: string;
}

/** Editor's picks playlist parameters */
export interface IpPlaylistParams extends PaginatedParams {
  /** ip id (required) */
  id: string;
}

/** Editor's picks zone parameters */
export interface IpZoneParams extends CommonParams {}

/** Editor's picks zone detail parameters */
export interface IpZoneHomeParams extends CommonParams {
  /** ip id (required) */
  id: string;
}

// ============================================================
//  Request Parameter Types — VIP (Concept Edition only)
// ============================================================

/** Claim VIP parameters */
export interface YouthVipParams extends CommonParams {}

/** Claim one-day VIP parameters */
export interface YouthDayVipParams extends CommonParams {
  /** VIP claim date, format YYYY-MM-DD (required) */
  receive_day: string;
}

/** Upgrade Concept Edition VIP parameters */
export interface YouthDayVipUpgradeParams extends CommonParams {}

/** Get VIP days claimed this month parameters */
export interface YouthMonthVipRecordParams extends CommonParams {}

/** Get VIP claim status parameters */
export interface YouthUnionVipParams extends CommonParams {}

// ============================================================
//  Request Parameter Types — Artists
// ============================================================

/** Get artist list parameters */
export interface ArtistListsParams extends CommonParams {
  /**
   * Gender type
   * - 0: All
   * - 1: Male
   * - 2: Female
   * - 3: Group
   */
  sextypes?: ArtistSexType;
  /**
   * Region type
   * - 0: All
   * - 1: Chinese
   * - 2: Western
   * - 3: Japan/Korea
   * - 4: Other
   * - 5: Japan
   * - 6: Korea
   */
  type?: ArtistRegionType;
  /** 3 = musician, 0 = default */
  musician?: 0 | 3;
  /** Number of hot items to return, default 30 */
  hotsize?: number;
}

/** Get artist detail parameters */
export interface ArtistDetailParams extends CommonParams {
  /** Artist id (required) */
  id: string;
}

/** Get artist albums parameters */
export interface ArtistAlbumsParams extends PaginatedParams {
  /** Artist id (required) */
  id: string;
  /** Sort: hot = popular, new = latest */
  sort?: ArtistSort;
}

/** Get artist songs parameters */
export interface ArtistAudiosParams extends PaginatedParams {
  /** Artist id (required) */
  id: string;
  /** Sort: hot = popular, new = latest */
  sort?: ArtistSort;
}

/** Get artist MVs parameters */
export interface ArtistVideosParams extends PaginatedParams {
  /** Artist id (required) */
  id: string;
  /** MV tag filter; all by default */
  tag?: ArtistVideoTag;
}

/** Follow artist parameters */
export interface ArtistFollowParams extends CommonParams {
  /** Artist id (required) */
  id: string;
}

/** Unfollow artist parameters */
export interface ArtistUnfollowParams extends CommonParams {
  /** Artist id (required) */
  id: string;
}

/** Get followed artist new songs parameters */
export interface ArtistFollowNewsongsParams extends CommonParams {
  /** Last album id */
  last_album_id?: string;
  /** Items per page, default 30 */
  pagesize?: number;
  /** Sort: 1 = time (default), 2 = affinity */
  opt_sort?: FollowNewSongsSort;
}

/** Get artist honor detail parameters */
export interface ArtistHonourParams extends PaginatedParams {
  /** Artist id (required) */
  id: string;
}

/** Get artist list (new version) parameters */
export interface SingerListParams extends CommonParams {
  /** Gender type: 0 = all, 1 = male, 2 = female */
  sextype?: number;
  /** Region type: 0 = all, 1 = Chinese, 2 = Western, 3 = Japan/Korea, 4 = other */
  type?: number;
  /** Number of hot items to return, default 200 */
  hotsize?: number;
}

// ============================================================
//  Request Parameter Types — Video
// ============================================================

/** Get video URL parameters */
export interface VideoUrlParams extends CommonParams {
  /** Video hash (required) */
  hash: string;
}

/** Get song MV parameters */
export interface KmrAudioMvParams extends CommonParams {
  /** Album track id (album_audio_id/MixSongID); comma-separated (required) */
  album_audio_id: string;
  /** Return fields; comma-separated */
  fields?: string;
}

/** Get video related info parameters */
export interface VideoPrivilegeParams extends CommonParams {
  /** Video hash; comma-separated (required) */
  hash: string;
}

/** Get video detail parameters */
export interface VideoDetailParams extends CommonParams {
  /** Video id (required) */
  id: string;
}

// ============================================================
//  Request Parameter Types — New Song Releases
// ============================================================

/** New song releases parameters */
export interface TopSongParams extends CommonParams {}

// ============================================================
//  Request Parameter Types — Scene Music
// ============================================================

/** Scene music list parameters */
export interface SceneListsParams extends CommonParams {}

/** Scene music detail parameters */
export interface SceneModuleParams extends CommonParams {
  /** Scene music scene_id (required) */
  id: string;
}

/** Scene music discussion parameters */
export interface SceneListV2Params extends PaginatedParams {
  /** Scene music scene_id (required) */
  id: string;
  /** Sort: rec = recommended, hot = popular, new = latest (default recommended) */
  sort?: SceneSort;
}

/** Scene music module tag parameters */
export interface SceneModuleInfoParams extends CommonParams {
  /** Scene music scene_id (required) */
  id: string;
  /** Scene music module_id (required) */
  module_id: string;
}

/** Scene music playlist list parameters */
export interface SceneCollectionListParams extends PaginatedParams {
  /** Scene music tag_id (required) */
  tag_id: string;
}

/** Scene music video list parameters */
export interface SceneVideoListParams extends PaginatedParams {
  /** Scene music video tag_id (required) */
  tag_id: string;
}

/** Scene music track list parameters */
export interface SceneAudioListParams extends PaginatedParams {
  /** Scene music scene_id (required) */
  id: string;
  /** Scene music module_id (required) */
  module_id: string;
  /** Scene music tag_id (required) */
  tag: string;
}

/** Scene music recommendation parameters */
export interface SceneMusicParams extends PaginatedParams {
  /** Scene music scene_id (required) */
  id: string;
}

// ============================================================
//  Request Parameter Types — Recommendations
// ============================================================

/** Daily recommendation parameters */
export interface EverydayRecommendParams extends CommonParams {
  /** Device type, default ios */
  platform?: Platform;
}

/** History recommendation parameters */
export interface EverydayHistoryParams extends CommonParams {
  /**
   * Mode
   * - list: Return history recommendation list
   * - song: Return current song list
   */
  mode?: HistoryMode;
  /** Required when mode = song */
  history_name?: string;
  /** Required when mode = song */
  date?: string;
  /** Device type, default ios */
  platform?: Platform;
}

/** Style recommendation parameters */
export interface EverydayStyleRecommendParams extends CommonParams {
  /** Device type, default ios */
  platform?: Platform;
  /** Style tag ids; comma-separated */
  tagids?: string;
}

/** Daily recommended songs parameters */
export interface RecommendSongsParams extends CommonParams {
  /** Device type, default android */
  platform?: Platform;
  /** User id */
  userid?: string;
}

/** Friend recommendation parameters */
export interface EverydayFriendParams extends CommonParams {}

// ============================================================
//  Request Parameter Types — Charts
// ============================================================

/** Chart list parameters */
export interface RankListParams extends CommonParams {
  /** Whether to return songs (partial) */
  withsong?: boolean | string | number;
}

/** Chart recommendation list parameters */
export interface RankTopParams extends CommonParams {}

/** Chart past editions list parameters */
export interface RankVolParams extends CommonParams {
  /** Chart id (required) */
  rankid: string;
  /** Chart cid */
  rank_cid?: string;
}

/** Chart info parameters */
export interface RankInfoParams extends CommonParams {
  /** Chart id (required) */
  rankid: string;
  /** Chart cid */
  rank_cid?: string;
  /** Return album images: 1 = yes, 0 = no (default yes) */
  album_img?: 0 | 1;
  /** Chart zone */
  zone?: string;
}

/** Chart song list parameters */
export interface RankAudioParams extends PaginatedParams {
  /** Chart id (required) */
  rankid: string;
  /** Chart cid; required for past edition songs (from volid in `/rank/vol`) */
  rank_cid?: string;
}

// ============================================================
//  Request Parameter Types — Comments
// ============================================================

/** Song favorite count parameters */
export interface FavoriteCountParams extends CommonParams {
  /** Music mixsongid; comma-separated (required) */
  mixsongids: string;
}

/** Song comment count parameters */
export interface CommentCountParams extends CommonParams {
  /** Music hash (one of hash or special_id) */
  hash?: string;
  /** Comment special_child_id (one of hash or special_id) */
  special_id?: string;
}

/** Song comments parameters */
export interface CommentMusicParams extends PaginatedParams {
  /** Music mixsongid (required) */
  mixsongid: string;
  /** Return category list: 0 = no, 1 = yes */
  show_classify?: 0 | 1;
  /** Return hot words: 0 = no, 1 = yes */
  show_hotword_list?: 0 | 1;
}

/** Song comments by category parameters */
export interface CommentMusicClassifyParams extends PaginatedParams {
  /** Music mixsongid (required) */
  mixsongid: string;
  /** Category id (required) */
  type_id: string;
  /** Sort: 1 = ascending, 2 = descending */
  sort?: CommentSort;
}

/** Song comments by hot word parameters */
export interface CommentMusicHotwordParams extends PaginatedParams {
  /** Music mixsongid (required) */
  mixsongid: string;
  /** Hot word (required) */
  hot_word: string;
}

/** Thread reply comments parameters */
export interface CommentFloorParams extends PaginatedParams {
  /** Comment special_child_id (required) */
  special_id: string;
  /** Song mixsongid (required) */
  mixsongid: string;
  /** Comment id (required) */
  tid: string;
}

/** Playlist comments parameters */
export interface CommentPlaylistParams extends PaginatedParams {
  /** Playlist global_collection_id (required) */
  id: string;
  /** Return category list: 0 = no, 1 = yes */
  show_classify?: 0 | 1;
  /** Return hot words: 0 = no, 1 = yes */
  show_hotword_list?: 0 | 1;
}

/** Album comments parameters */
export interface CommentAlbumParams extends PaginatedParams {
  /** Album id (required) */
  id: string;
  /** Return category list: 0 = no, 1 = yes */
  show_classify?: 0 | 1;
  /** Return hot words: 0 = no, 1 = yes */
  show_hotword_list?: 0 | 1;
}

// ============================================================
//  Request Parameter Types — Sheet Music
// ============================================================

/** Song sheet music parameters */
export interface SheetListParams extends PaginatedParams {
  /** Music mixsongid / album_audio_id (required) */
  album_audio_id: string;
  /**
   * Sheet music type
   * - 0: All
   * - 1: Piano
   * - 2: Guitar
   * - 3: Drums
   * - 98: Numbered notation
   * - 99: Other
   */
  opern_type?: SheetOpernType;
}

/** Sheet music detail parameters */
export interface SheetDetailParams extends CommonParams {
  /** Sheet music id (required) */
  id: string;
  /** Sheet music source (required) */
  source: string;
}

/** Recommended sheet music parameters */
export interface SheetHotParams extends CommonParams {
  /** Sheet music type */
  opern_type?: SheetOpernType;
}

/** Sheet music collection parameters (incl. collection detail) */
export interface SheetCollectionParams extends PaginatedParams {
  /**
   * position type
   * - 2: Featured sheet playlists
   * - 3: Music textbooks
   * - 4: Classical piano
   */
  position?: SheetCollectionPosition;
  /** Collection id (pass when fetching collection detail) */
  collection_id?: string;
}

/**
 * Sheet music recommendation parameters
 *
 * instruments instrument types:
 * - 1: Guitar (opern_level: 0=intermediate, 1=advanced, 2=basic)
 * - 2: Ukulele (opern_level: 0=basic, 1=advanced)
 * - 3: Piano (opern_level: 0=basic, 1=advanced)
 * - 4: Numbered notation (opern_level: 0=basic)
 */
export interface SheetExploreParams extends PaginatedParams {
  /** Instrument type, default 1 */
  instruments?: number;
  /** Difficulty level, default 0 */
  level?: number;
  /** Tag id */
  tagid?: number;
}

/**
 * Sheet music ranking parameters
 *
 * instruments types same as SheetExploreParams
 */
export interface SheetRankParams extends PaginatedParams {
  /** Instrument type, default 1 */
  instruments?: number;
  /** Difficulty level, default 0 */
  level?: number;
  /** Tag id */
  tagid?: number;
}

/** Sheet music song detail parameters */
export interface SheetSongParams extends CommonParams {
  /** Album track id (album_audio_id/MixSongID) (required) */
  album_audio_id: string;
  /** Instrument type, default 1 */
  instruments?: number;
  /** Difficulty level, default 0 */
  level?: number;
}

/** Get sheet music tags parameters */
export interface SheetTagsParams extends CommonParams {}

// ============================================================
//  Request Parameter Types — Listening History & Server
// ============================================================

/** Submit listening history parameters */
export interface PlayhistoryUploadParams extends CommonParams {
  /** Album track id (album_audio_id/MixSongID) (required) */
  mxid: string;
  /** Current timestamp (seconds, not ms); also available from `/server/now` */
  ot?: number | string;
  /** Current play count; keeps max if server value is higher, otherwise updates */
  pc?: number;
}

/** Get server time parameters */
export interface ServerNowParams extends CommonParams {}

// ============================================================
//  Request Parameter Types — Brush Feed & AI
// ============================================================

/** Brush feed parameters */
export interface BrushParams extends CommonParams {}

/** AI recommendation parameters */
export interface AiRecommendParams extends CommonParams {
  /** Album track id (album_audio_id/MixSongID); comma-separated (required) */
  album_audio_id: string;
}

// ============================================================
//  Request Parameter Types — Channels
// ============================================================

/** Get all user channels parameters */
export interface YouthChannelAllParams extends PaginatedParams {}

/** Channel detail parameters */
export interface YouthChannelDetailParams extends CommonParams {
  /** Channel id (global_collection_id/channel_id); comma-separated (required) */
  global_collection_id: string;
}

/** Channel recommendation parameters */
export interface YouthChannelAmwayParams extends CommonParams {
  /** Channel id (global_collection_id/channel_id) (required) */
  global_collection_id: string;
}

/** Similar channels parameters */
export interface YouthChannelSimilarParams extends CommonParams {
  /** Channel id (global_collection_id/channel_id) (required) */
  channel_id: string;
}

/** Channel subscription parameters */
export interface YouthChannelSubParams extends CommonParams {
  /** Channel id (global_collection_id/channel_id) (required) */
  global_collection_id: string;
  /** 1 = subscribe, 0 = unsubscribe, default subscribe */
  t?: 0 | 1;
}

/** Channel music story parameters */
export interface YouthChannelSongParams extends PaginatedParams {
  /** Channel id (global_collection_id/channel_id) (required) */
  global_collection_id: string;
}

/** Channel music story detail parameters */
export interface YouthChannelSongDetailParams extends CommonParams {
  /** Channel id (global_collection_id/channel_id) (required) */
  global_collection_id: string;
  /** Music story fileid (required) */
  fileid: string;
}

/** Activity feed - most visited parameters */
export interface YouthDynamicRecentParams extends CommonParams {}

// ============================================================
//  Request Parameter Types — User Public Music
// ============================================================

/** Get user public music parameters */
export interface YouthUserSongParams extends PaginatedParams {
  /** User id (required) */
  userid: string;
}

// ============================================================
//  Request Parameter Types — Audiobooks
// ============================================================

/** Audiobook - daily recommendation parameters */
export interface LongaudioDailyRecommendParams extends PaginatedParams {}

/** Audiobook - chart recommendation parameters */
export interface LongaudioRankRecommendParams extends CommonParams {}

/** Audiobook - VIP recommendation parameters */
export interface LongaudioVipRecommendParams extends CommonParams {}

/** Audiobook - weekly recommendation parameters */
export interface LongaudioWeekRecommendParams extends CommonParams {}

/** Audiobook - album detail parameters */
export interface LongaudioAlbumDetailParams extends CommonParams {
  /** Album id; comma-separated (required) */
  album_id: string;
}

/** Audiobook - album track list parameters */
export interface LongaudioAlbumAudiosParams extends CommonParams {
  /** Album id; comma-separated (required) */
  album_id: string;
}

// ============================================================
//  Request Parameter Types — Song Report Cards
// ============================================================

/** Song report card parameters */
export interface SongRankingParams extends CommonParams {
  /** Album track id (album_audio_id/MixSongID) (required) */
  album_audio_id: string;
}

/** Song report card detail parameters */
export interface SongRankingFilterParams extends PaginatedParams {
  /** Album track id (album_audio_id/MixSongID) (required) */
  album_audio_id: string;
}

// ============================================================
//  Server & Utility Types
// ============================================================

/** Express app extension with underlying HTTP Server reference */
export interface ServerExtension {
  /** Underlying HTTP Server instance */
  service?: import('http').Server;
}

/** Module definition structure */
export interface ModuleDefinition {
  /** Module identifier (filename without .js extension) */
  identifier?: string;
  /** Express route path */
  route: string;
  /** Module export or file path */
  module: any;
}

/** Request config object (passed to createRequest) */
export interface RequestConfig {
  /** Client IP */
  ip?: string;
  [key: string]: any;
}

// ============================================================
//  Exported Functions — Login & Authentication
// ============================================================

/**
 * Phone number verification code login
 * @route /login/cellphone
 */
export function login_cellphone(params: LoginCellphoneParams): Promise<ApiResponse>;

/**
 * Username/password login (may require verification; not recommended)
 * @route /login
 */
export function login(params: LoginParams): Promise<ApiResponse>;

/**
 * WeChat Open Platform login
 * @route /login/openplat
 */
export function login_openplat(params: LoginOpenplatParams): Promise<ApiResponse>;

/**
 * QQ OAuth login
 * @route /login/qq
 */
export function login_qq(params: LoginQqParams): Promise<ApiResponse>;

/**
 * QR code login - generate key
 * @route /login/qr/key
 */
export function login_qr_key(params?: LoginQrKeyParams): Promise<ApiResponse>;

/**
 * QR code login - generate QR code
 * @route /login/qr/create
 */
export function login_qr_create(params: LoginQrCreateParams): Promise<ApiResponse>;

/**
 * QR code login - check scan status
 * - 0: QR code expired
 * - 1: Waiting for scan
 * - 2: Pending confirmation
 * - 4: Authorization successful (returns token)
 * @route /login/qr/check
 */
export function login_qr_check(params: LoginQrCheckParams): Promise<ApiResponse>;

/**
 * WeChat login - generate QR code
 * @route /login/wx/create
 */
export function login_wx_create(params?: LoginWxCreateParams): Promise<ApiResponse>;

/**
 * WeChat login - check scan status
 * - 408: Waiting for scan
 * - 404: Scanned
 * - 403: Login denied
 * - 405: Login successful (returns wx_code)
 * - 402: Expired
 * @route /login/wx/check
 */
export function login_wx_check(params: LoginWxCheckParams): Promise<ApiResponse>;

/**
 * QQ login - generate QR code
 * @route /login/qq/qr/create
 */
export function login_qq_qr_create(params?: LoginQqQrCreateParams): Promise<ApiResponse>;

/**
 * QQ login - check scan status; returns KuGou login state on success
 * @route /login/qq/qr/check
 */
export function login_qq_qr_check(params: LoginQqQrCheckParams): Promise<ApiResponse>;

/**
 * Refresh login state and extend token expiry
 * @route /login/token
 */
export function login_token(params?: LoginTokenParams): Promise<ApiResponse>;

/**
 * Get user device list (login required)
 * @route /v2/get_dev
 */
export function login_device(params?: LoginDeviceParams): Promise<ApiResponse>;

/**
 * Log out specific device (login required)
 * @route /loginservice/v1/dev_logout
 */
export function login_device_kick(params?: LoginDeviceKickParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Captcha & Device
// ============================================================

/**
 * Send phone verification code
 * @route /captcha/sent
 */
export function captcha_sent(params: CaptchaSentParams): Promise<ApiResponse>;

/**
 * Get dfid (device id); call before fetching music URL
 * @route /register/dev
 */
export function register_dev(params?: RegisterDevParams): Promise<ApiResponse>;

/**
 * Get verification info (when login triggers secondary verification)
 * @route /verifyservice/v3/get_verify_info
 */
export function get_verify_info(params: GetVerifyInfoParams): Promise<ApiResponse>;

/**
 * Submit verification (Tencent captcha / phone code)
 * @route /verifyservice/v4/verify_user_info
 */
export function verify_user_info(params: VerifyUserInfoParams): Promise<ApiResponse>;

/**
 * Generate sid/edt and submit verification (calls generateSimulate + verify_user_info internally)
 * @route /verifyservice/v4/verify_user_info
 */
export function sidedt(params?: SidedtParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — User Info
// ============================================================

/**
 * Get user extra info (login required)
 * @route /user/detail
 */
export function user_detail(params?: UserDetailParams): Promise<ApiResponse>;

/**
 * Get user VIP info (login required)
 * @route /user/vip/detail
 */
export function user_vip_detail(params?: UserVipDetailParams): Promise<ApiResponse>;

/**
 * Get all user-created and favorited playlists (login required)
 * @route /user/playlist
 */
export function user_playlist(params?: UserPlaylistParams): Promise<ApiResponse>;

/**
 * Get all followed artists/users (login required)
 * @route /user/follow
 */
export function user_follow(params?: UserFollowParams): Promise<ApiResponse>;

/**
 * Get followed artist/user messages (login required)
 * @route /user/follow/message
 */
export function user_follow_message(params: UserFollowMessageParams): Promise<ApiResponse>;

/**
 * Get user cloud music (login required)
 * @route /user/cloud
 */
export function user_cloud(params?: UserCloudParams): Promise<ApiResponse>;

/**
 * Get user cloud music URL (login required; files ~10M currently)
 * @route /user/cloud/url
 */
export function user_cloud_url(params: UserCloudUrlParams): Promise<ApiResponse>;

/**
 * Delete user cloud music (login required)
 * @route /user/cloud/del
 */
export function user_cloud_del(params: UserCloudDelParams): Promise<ApiResponse>;

/**
 * Pre-upload cloud library matching (login required)
 * @route /user/cloud/match
 */
export function user_cloud_match(params: UserCloudMatchParams): Promise<ApiResponse>;

/**
 * Upload music to cloud (login required)
 * @route /user/cloud/upload
 */
export function user_cloud_upload(params: UserCloudUploadParams): Promise<ApiResponse>;

/**
 * Get user collected videos (login required)
 * @route /user/video/collect
 */
export function user_video_collect(params?: UserVideoCollectParams): Promise<ApiResponse>;

/**
 * Get user liked videos (login required)
 * @route /user/video/love
 */
export function user_video_love(params?: UserVideoLoveParams): Promise<ApiResponse>;

/**
 * Get user listening history ranking (login required)
 * @route /user/listen
 */
export function user_listen(params?: UserListenParams): Promise<ApiResponse>;

/**
 * Get user recent listening history (login required)
 * @route /user/history
 */
export function user_history(params?: UserHistoryParams): Promise<ApiResponse>;

/**
 * Get continue playing info; mobile home continue-play entry (login required)
 * @route /lastest/songs/listen
 */
export function lastest_songs_listen(params?: LastestSongsListenParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Playlist Management
// ============================================================

/**
 * Favorite / create playlist (login required)
 * @route /playlist/add
 */
export function playlist_add(params: PlaylistAddParams): Promise<ApiResponse>;

/**
 * Unfavorite / delete playlist (login required)
 * @route /playlist/del
 */
export function playlist_del(params: PlaylistDelParams): Promise<ApiResponse>;

/**
 * Add songs to playlist (login required)
 * @route /playlist/tracks/add
 */
export function playlist_tracks_add(params: PlaylistTracksAddParams): Promise<ApiResponse>;

/**
 * Remove songs from playlist (login required)
 * @route /playlist/tracks/del
 */
export function playlist_tracks_del(params: PlaylistTracksDelParams): Promise<ApiResponse>;

/**
 * Get playlist categories (incl. category info)
 * @route /playlist/tags
 */
export function playlist_tags(params?: PlaylistTagsParams): Promise<ApiResponse>;

/**
 * Get playlist list
 * @route /top/playlist
 */
export function top_playlist(params: TopPlaylistParams): Promise<ApiResponse>;

/**
 * Get theme playlist
 * @route /theme/playlist
 */
export function theme_playlist(params?: ThemePlaylistParams): Promise<ApiResponse>;

/**
 * Get sound-effect playlist
 * @route /playlist/effect
 */
export function playlist_effect(params?: PlaylistEffectParams): Promise<ApiResponse>;

/**
 * Get playlist detail
 * @route /playlist/detail
 */
export function playlist_detail(params: PlaylistDetailParams): Promise<ApiResponse>;

/**
 * Get all playlist songs
 * @route /playlist/track/all
 */
export function playlist_track_all(params: PlaylistTrackAllParams): Promise<ApiResponse>;

/**
 * Get all playlist songs (new; user-created and favorited only)
 * @route /playlist/track/all/new
 */
export function playlist_track_all_new(params: PlaylistTrackAllNewParams): Promise<ApiResponse>;

/**
 * Get similar playlists
 * @route /playlist/similar
 */
export function playlist_similar(params: PlaylistSimilarParams): Promise<ApiResponse>;

/**
 * Get all theme playlist songs
 * @route /theme/playlist/track
 */
export function theme_playlist_track(params: ThemePlaylistTrackParams): Promise<ApiResponse>;

/**
 * Get theme music
 * @route /theme/music
 */
export function theme_music(params?: ThemeMusicParams): Promise<ApiResponse>;

/**
 * Get theme music detail
 * @route /theme/music/detail
 */
export function theme_music_detail(params: ThemeMusicDetailParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Album
// ============================================================

/**
 * Get new album releases
 * @route /top/album
 */
export function top_album(params?: TopAlbumParams): Promise<ApiResponse>;

/**
 * Get album info
 * @route /album
 */
export function album(params: AlbumParams): Promise<ApiResponse>;

/**
 * Get album detail
 * @route /album/detail
 */
export function album_detail(params: AlbumDetailParams): Promise<ApiResponse>;

/**
 * Get album track list
 * @route /album/songs
 */
export function album_songs(params: AlbumSongsParams): Promise<ApiResponse>;

/**
 * Get record store category data
 * @route /zhuanjidata/v3/album_shop_v2/get_classify_data
 */
export function album_shop(params?: AlbumShopParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Music / Songs
// ============================================================

/**
 * Get music URL (call /register/dev for dfid first)
 * @route /song/url
 */
export function song_url(params: SongUrlParams): Promise<ApiResponse>;

/**
 * Get music URL (new; all qualities at once, but audio may be encrypted)
 * @route /song/url/new
 */
export function song_url_new(params: SongUrlNewParams): Promise<ApiResponse>;

/**
 * Get song climax section timing
 * @route /song/climax
 */
export function song_climax(params: SongClimaxParams): Promise<ApiResponse>;

/**
 * Get music related info
 * @route /audio
 */
export function audio(params: AudioParams): Promise<ApiResponse>;

/**
 * Get more music versions
 * @route /audio/related
 */
export function audio_related(params: AudioRelatedParams): Promise<ApiResponse>;

/**
 * Get best accompaniment info
 * @route /audio/accompany/matching
 */
export function audio_accompany_matching(params: AudioAccompanyMatchingParams): Promise<ApiResponse>;

/**
 * Get music karaoke count (params from /audio/accompany/matching)
 * @route /audio/ktv/total
 */
export function audio_ktv_total(params: AudioKtvTotalParams): Promise<ApiResponse>;

/**
 * Get music detail
 * @route /privilege/lite
 */
export function privilege_lite(params: PrivilegeLiteParams): Promise<ApiResponse>;

/**
 * Get music album/artist info
 * @route /krm/audio
 */
export function krm_audio(params: KrmAudioParams): Promise<ApiResponse>;

/**
 * Get song recommendations (Standard Edition)
 * @route /top/card
 */
export function top_card(params: TopCardParams): Promise<ApiResponse>;

/**
 * Get song recommendations (Concept Edition)
 * @route /top/card/youth
 */
export function top_card_youth(params: TopCardYouthParams): Promise<ApiResponse>;

/**
 * Get genre blind box (Concept Edition)
 * @route /youth/v1/song/tag_card_recommend
 */
export function top_tag_card_youth(params?: TopTagCardYouthParams): Promise<ApiResponse>;

/**
 * Get artist and album images
 * @route /images
 */
export function images(params: ImagesParams): Promise<ApiResponse>;

/**
 * Get artist images
 * @route /images/audio
 */
export function images_audio(params: ImagesAudioParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Search
// ============================================================

/**
 * Search music / MV / playlist / lyrics / album / artist
 * ⚠️ Requires cookie auth; otherwise returns error_code: 152
 * @route /search
 */
export function search(params: SearchParams): Promise<ApiResponse>;

/**
 * Get default search keywords
 * @route /search/default
 */
export function search_default(params?: SearchDefaultParams): Promise<ApiResponse>;

/**
 * Complex search (songs, artists, playlists, etc.)
 * @route /search/complex
 */
export function search_complex(params: SearchComplexParams): Promise<ApiResponse>;

/**
 * Get hot search list
 * @route /search/hot
 */
export function search_hot(params?: SearchHotParams): Promise<ApiResponse>;

/**
 * Get search suggestions (songs, artists, playlists)
 * @route /search/suggest
 */
export function search_suggest(params: SearchSuggestParams): Promise<ApiResponse>;

/**
 * Lyric search; use with /lyric
 * @route /search/lyric
 */
export function search_lyric(params: SearchLyricParams): Promise<ApiResponse>;

/**
 * Mixed search (iOS endpoint)
 * @route /v3/search/mixed
 */
export function search_mixed(params: SearchMixedParams): Promise<ApiResponse>;

/**
 * Get lyrics (call /search/lyric for id and accesskey first)
 * @route /lyric
 */
export function lyric(params: LyricParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Personal FM
// ============================================================

/**
 * Personal FM (Guess You Like on mobile and PC)
 * @route /personal/fm
 */
export function personal_fm(params?: PersonalFmParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Banner / Music Library
// ============================================================

/**
 * Get banner carousel data
 * @route /pc/diantai
 */
export function pc_diantai(params?: PcDiantaiParams): Promise<ApiResponse>;

/**
 * Get music library banner carousel data
 * @route /yueku/banner
 */
export function yueku_banner(params?: YuekuBannerParams): Promise<ApiResponse>;

/**
 * Get music library radio data
 * @route /yueku/fm
 */
export function yueku_fm(params?: YuekuFmParams): Promise<ApiResponse>;

/**
 * Get mobile music library data
 * @route /yueku
 */
export function yueku(params?: YuekuParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Radio
// ============================================================

/**
 * Get all radio category data
 * @route /fm/class
 */
export function fm_class(params?: FmClassParams): Promise<ApiResponse>;

/**
 * Get recommended radio
 * @route /fm/recommend
 */
export function fm_recommend(params?: FmRecommendParams): Promise<ApiResponse>;

/**
 * Get radio images
 * @route /fm/image
 */
export function fm_image(params: FmImageParams): Promise<ApiResponse>;

/**
 * Get radio music list
 * @route /fm/songs
 */
export function fm_songs(params: FmSongsParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Editor's Picks
// ============================================================

/**
 * Get editor's picks data
 * @route /top/ip
 */
export function top_ip(params?: TopIpParams): Promise<ApiResponse>;

/**
 * Get editor's picks related data
 * @route /ip
 */
export function ip(params: IpParams): Promise<ApiResponse>;

/**
 * Get editor's picks detail (batch)
 * @route /openapi/v1/ip
 */
export function ip_dateil(params: IpDateilParams): Promise<ApiResponse>;

/**
 * Get editor's picks playlist data
 * @route /ip/playlist
 */
export function ip_playlist(params: IpPlaylistParams): Promise<ApiResponse>;

/**
 * Get editor's picks zone content
 * @route /ip/zone
 */
export function ip_zone(params?: IpZoneParams): Promise<ApiResponse>;

/**
 * Get editor's picks zone detail
 * @route /ip/zone/home
 */
export function ip_zone_home(params: IpZoneHomeParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — VIP (Concept Edition only)
// ============================================================

/**
 * Claim VIP (test endpoint, Concept Edition only; currently unavailable)
 * @route /youth/vip
 */
export function youth_vip(params?: YouthVipParams): Promise<ApiResponse>;

/**
 * Claim one-day VIP (test endpoint, Concept Edition only)
 * @route /youth/day/vip
 */
export function youth_day_vip(params: YouthDayVipParams): Promise<ApiResponse>;

/**
 * Upgrade Concept Edition VIP to unlimited VIP (claim one-day VIP first)
 * @route /youth/day/vip/upgrade
 */
export function youth_day_vip_upgrade(params?: YouthDayVipUpgradeParams): Promise<ApiResponse>;

/**
 * Get VIP days claimed this month (test endpoint, Concept Edition only)
 * @route /youth/month/vip/record
 */
export function youth_month_vip_record(params?: YouthMonthVipRecordParams): Promise<ApiResponse>;

/**
 * Get VIP claim status (test endpoint, Concept Edition only)
 * @route /youth/union/vip
 */
export function youth_union_vip(params?: YouthUnionVipParams): Promise<ApiResponse>;

/**
 * Earn VIP by listening (login required)
 * @route /youth/v2/report/listen_song
 */
export function youth_listen_song(params?: YouthListenSongParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Artists
// ============================================================

/**
 * Get artist list
 * @route /artist/lists
 */
export function artist_lists(params?: ArtistListsParams): Promise<ApiResponse>;

/**
 * Get artist detail
 * @route /artist/detail
 */
export function artist_detail(params: ArtistDetailParams): Promise<ApiResponse>;

/**
 * Get artist albums
 * @route /artist/albums
 */
export function artist_albums(params: ArtistAlbumsParams): Promise<ApiResponse>;

/**
 * Get artist songs
 * @route /artist/audios
 */
export function artist_audios(params: ArtistAudiosParams): Promise<ApiResponse>;

/**
 * Get artist MVs
 * @route /artist/videos
 */
export function artist_videos(params: ArtistVideosParams): Promise<ApiResponse>;

/**
 * Follow artist (login required)
 * @route /artist/follow
 */
export function artist_follow(params: ArtistFollowParams): Promise<ApiResponse>;

/**
 * Unfollow artist (login required)
 * @route /artist/unfollow
 */
export function artist_unfollow(params: ArtistUnfollowParams): Promise<ApiResponse>;

/**
 * Get new songs from followed artists (login required)
 * @route /artist/follow/newsongs
 */
export function artist_follow_newsongs(params?: ArtistFollowNewsongsParams): Promise<ApiResponse>;

/**
 * Get artist honor detail
 * @route /v1/query_singer_honour_detail
 */
export function artist_honour(params: ArtistHonourParams): Promise<ApiResponse>;

/**
 * Get artist list (new version)
 * @route /ocean/v6/singer/list
 */
export function singer_list(params?: SingerListParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Video
// ============================================================

/**
 * Get video URL
 * @route /video/url
 */
export function video_url(params: VideoUrlParams): Promise<ApiResponse>;

/**
 * Get MV for song
 * @route /kmr/audio/mv
 */
export function kmr_audio_mv(params: KmrAudioMvParams): Promise<ApiResponse>;

/**
 * Get video related info
 * @route /video/privilege
 */
export function video_privilege(params: VideoPrivilegeParams): Promise<ApiResponse>;

/**
 * Get video detail (higher quality video hash available)
 * @route /video/detail
 */
export function video_detail(params: VideoDetailParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — New Song Releases
// ============================================================

/**
 * Get new song releases
 * @route /top/song
 */
export function top_song(params?: TopSongParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Scene Music
// ============================================================

/**
 * Get scene music list
 * @route /scene/lists
 */
export function scene_lists(params?: SceneListsParams): Promise<ApiResponse>;

/**
 * Get scene music detail
 * @route /scene/module
 */
export function scene_module(params: SceneModuleParams): Promise<ApiResponse>;

/**
 * Get scene music discussion
 * @route /scene/list/v2
 */
export function scene_lists_v2(params: SceneListV2Params): Promise<ApiResponse>;

/**
 * Get scene music module tag
 * @route /scene/module/info
 */
export function scene_module_info(params: SceneModuleInfoParams): Promise<ApiResponse>;

/**
 * Get scene music playlist list
 * @route /scene/collection/list
 */
export function scene_collection_list(params: SceneCollectionListParams): Promise<ApiResponse>;

/**
 * Get scene music video list
 * @route /scene/video/list
 */
export function scene_video_list(params: SceneVideoListParams): Promise<ApiResponse>;

/**
 * Get scene music track list
 * @route /scene/audio/list
 */
export function scene_audio_list(params: SceneAudioListParams): Promise<ApiResponse>;

/**
 * Get scene music recommendations
 * @route /genesisapi/v1/scene_music/rec_music
 */
export function scene_music(params: SceneMusicParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Recommendations
// ============================================================

/**
 * Get daily recommendation list
 * @route /everyday/recommend
 */
export function everyday_recommend(params?: EverydayRecommendParams): Promise<ApiResponse>;

/**
 * Get history recommendations
 * @route /everyday/history
 */
export function everyday_history(params?: EverydayHistoryParams): Promise<ApiResponse>;

/**
 * Get style recommendations
 * @route /everyday/style/recommend
 */
export function everyday_style_recommend(params?: EverydayStyleRecommendParams): Promise<ApiResponse>;

/**
 * Get daily recommended songs
 * @route /everyday_song_recommend
 */
export function recommend_songs(params?: RecommendSongsParams): Promise<ApiResponse>;

/**
 * Get friend recommendations
 * @route /sing7/relation/json/v3/friend_rec_by_using_song_list
 */
export function everyday_friend(params?: EverydayFriendParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Charts
// ============================================================

/**
 * Get chart list
 * @route /rank/list
 */
export function rank_list(params?: RankListParams): Promise<ApiResponse>;

/**
 * Get chart recommendation list
 * @route /rank/top
 */
export function rank_top(params?: RankTopParams): Promise<ApiResponse>;

/**
 * Get chart past editions list
 * @route /rank/vol
 */
export function rank_vol(params: RankVolParams): Promise<ApiResponse>;

/**
 * Get chart info
 * @route /rank/info
 */
export function rank_info(params: RankInfoParams): Promise<ApiResponse>;

/**
 * Get chart song list
 * @route /rank/audio
 */
export function rank_audio(params: RankAudioParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Comments
// ============================================================

/**
 * Get song favorite count (no login required)
 * @route /favorite/count
 */
export function favorite_count(params: FavoriteCountParams): Promise<ApiResponse>;

/**
 * Get song comment count (no login required)
 * @route /comment/count
 */
export function comment_count(params: CommentCountParams): Promise<ApiResponse>;

/**
 * Get all song comments (no login required)
 * @route /comment/music
 */
export function comment_music(params: CommentMusicParams): Promise<ApiResponse>;

/**
 * Get song comments by category (no login required)
 * @route /comment/music/classify
 */
export function comment_music_classify(params: CommentMusicClassifyParams): Promise<ApiResponse>;

/**
 * Get song comments by hot word (no login required)
 * @route /comment/music/hotword
 */
export function comment_music_hotword(params: CommentMusicHotwordParams): Promise<ApiResponse>;

/**
 * Get thread reply comments
 * @route /comment/floor
 */
export function comment_floor(params: CommentFloorParams): Promise<ApiResponse>;

/**
 * Get playlist comments (no login required)
 * @route /comment/playlist
 */
export function comment_playlist(params: CommentPlaylistParams): Promise<ApiResponse>;

/**
 * Get album comments (no login required)
 * @route /comment/album
 */
export function comment_album(params: CommentAlbumParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Sheet Music
// ============================================================

/**
 * Get song sheet music (AI sheets are XML; parse yourself)
 * @route /sheet/list
 */
export function sheet_list(params: SheetListParams): Promise<ApiResponse>;

/**
 * Get sheet music detail (AI sheets are XML; parse yourself)
 * @route /sheet/detail
 */
export function sheet_detail(params: SheetDetailParams): Promise<ApiResponse>;

/**
 * Get recommended sheet music
 * @route /sheet/hot
 */
export function sheet_hot(params?: SheetHotParams): Promise<ApiResponse>;

/**
 * Get sheet music collection / collection detail
 * @route /sheet/collection
 */
export function sheet_collection(params?: SheetCollectionParams): Promise<ApiResponse>;

/**
 * Get sheet music recommendations
 * @route /opern/v1/home/get_rec_opern
 */
export function sheet_explore(params?: SheetExploreParams): Promise<ApiResponse>;

/**
 * Get sheet music ranking
 * @route /opern/v1/home/get_rank_opern
 */
export function sheet_rank(params?: SheetRankParams): Promise<ApiResponse>;

/**
 * Get sheet music song detail
 * @route /opern/v1/detail/song_info
 */
export function sheet_song(params: SheetSongParams): Promise<ApiResponse>;

/**
 * Get sheet music tags
 * @route /opern/v1/home/get_tags
 */
export function sheet_tags(params?: SheetTagsParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Listening History & Server
// ============================================================

/**
 * Submit listening history (cross-device sync)
 * @route /playhistory/upload
 */
export function playhistory_upload(params: PlayhistoryUploadParams): Promise<ApiResponse>;

/**
 * Get server timestamp
 * @route /server/now
 */
export function server_now(params?: ServerNowParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Brush Feed & AI
// ============================================================

/**
 * Get brush feed videos
 * @route /brush
 */
export function brush(params?: BrushParams): Promise<ApiResponse>;

/**
 * Get AI recommended songs
 * @route /ai/recommend
 */
export function ai_recommend(params: AiRecommendParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Channels
// ============================================================

/**
 * Get all subscribed channels (login required)
 * @route /youth/channel/all
 */
export function youth_channel_all(params?: YouthChannelAllParams): Promise<ApiResponse>;

/**
 * Get channel detail
 * @route /youth/channel/detail
 */
export function youth_channel_detail(params: YouthChannelDetailParams): Promise<ApiResponse>;

/**
 * Get channel recommendations
 * @route /youth/channel/amway
 */
export function youth_channel_amway(params: YouthChannelAmwayParams): Promise<ApiResponse>;

/**
 * Get similar channels
 * @route /youth/channel/similar
 */
export function youth_channel_similar(params: YouthChannelSimilarParams): Promise<ApiResponse>;

/**
 * Subscribe / unsubscribe channel (login required)
 * @route /youth/channel/sub
 */
export function youth_channel_sub(params: YouthChannelSubParams): Promise<ApiResponse>;

/**
 * Get channel music stories
 * @route /youth/channel/song
 */
export function youth_channel_song(params: YouthChannelSongParams): Promise<ApiResponse>;

/**
 * Get channel music story detail
 * @route /youth/channel/song/detail
 */
export function youth_channel_song_detail(params: YouthChannelSongDetailParams): Promise<ApiResponse>;

/**
 * Get frequently visited channels and users (login required)
 * @route /youth/dynamic/recent
 */
export function youth_dynamic_recent(params?: YouthDynamicRecentParams): Promise<ApiResponse>;

/**
 * Get user activity feed (login required)
 * @route /youth/v3/user/get_dynamic
 */
export function youth_dynamic(params?: YouthDynamicParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — User Public Music
// ============================================================

/**
 * Get user public music
 * @route /youth/user/song
 */
export function youth_user_song(params: YouthUserSongParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Audiobooks
// ============================================================

/**
 * Audiobook - daily recommendation
 * @route /longaudio/daily/recommend
 */
export function longaudio_daily_recommend(params?: LongaudioDailyRecommendParams): Promise<ApiResponse>;

/**
 * Audiobook - chart recommendation
 * @route /longaudio/rank/recommend
 */
export function longaudio_rank_recommend(params?: LongaudioRankRecommendParams): Promise<ApiResponse>;

/**
 * Audiobook - VIP recommendation
 * @route /longaudio/vip/recommend
 */
export function longaudio_vip_recommend(params?: LongaudioVipRecommendParams): Promise<ApiResponse>;

/**
 * Audiobook - weekly recommendation
 * @route /longaudio/week/recommend
 */
export function longaudio_week_recommend(params?: LongaudioWeekRecommendParams): Promise<ApiResponse>;

/**
 * Audiobook - album detail
 * @route /longaudio/album/detail
 */
export function longaudio_album_detail(params: LongaudioAlbumDetailParams): Promise<ApiResponse>;

/**
 * Audiobook - album track list
 * @route /longaudio/album/audios
 */
export function longaudio_album_audios(params: LongaudioAlbumAudiosParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Song Report Cards
// ============================================================

/**
 * Get song report card info
 * @route /song/ranking
 */
export function song_ranking(params: SongRankingParams): Promise<ApiResponse>;

/**
 * Get detailed song report card info (login required)
 * @route /song/ranking/filter
 */
export function song_ranking_filter(params: SongRankingFilterParams): Promise<ApiResponse>;

// ============================================================
//  Exported Functions — Server Management (from server module)
// ============================================================

/**
 * Start KuGouMusic API HTTP service
 * @returns Express app instance (service property points to HTTP Server)
 */
export function startService(): Promise<import('express').Express & ServerExtension>;

/**
 * Dynamically scan directory for all API module definitions
 * @param modulesPath - Absolute path to modules directory
 * @param specificRoute - Custom route mapping
 * @param doRequire - Load modules via require (default true)
 */
export function getModulesDefinitions(modulesPath: string, specificRoute: Record<string, string>, doRequire?: boolean): Promise<ModuleDefinition[]>;

// ============================================================
//  Exported Functions — Request Utilities (from util/request module)
// ============================================================

/**
 * Create underlying HTTP request
 * @param config - Request configuration
 */
export function createRequest(config: RequestConfig): Promise<any>;
