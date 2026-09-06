export type ParseTarget =
  | 'images'
  | 'videos'
  | 'models_3d'
  | 'fonts'
  | 'text'
  | 'ui_components'
  | 'structure'
  | 'screenshots';

export interface ImageAsset {
  url: string;
  type: 'img' | 'background' | 'svg' | 'favicon' | 'og_image' | 'picture_source' | 'canvas';
  alt?: string;
  width?: number;
  height?: number;
  format?: string;
  sizeBytes?: number;
  localPath?: string;
}

export interface VideoAsset {
  url: string;
  type: 'video' | 'audio' | 'embed_youtube' | 'embed_vimeo' | 'embed_other';
  poster?: string;
  format?: string;
  title?: string;
  sizeBytes?: number;
  localPath?: string;
}

export type Model3DFormat =
  | 'glb'
  | 'gltf'
  | 'obj'
  | 'mtl'
  | 'fbx'
  | 'usdz'
  | 'ply'
  | 'splat'
  | 'stl'
  | 'draco'
  | 'bin'
  | 'unknown';

export interface Model3DAsset {
  url: string;
  format: Model3DFormat;
  mimeType?: string;
  source: 'network' | 'model_viewer' | 'canvas' | 'script' | 'link';
  sizeBytes?: number;
  localPath?: string;
}

export interface FontAsset {
  family: string;
  format: 'woff2' | 'woff' | 'ttf' | 'otf' | 'eot' | 'unknown';
  url: string;
  weight?: string;
  style?: string;
  source: 'css_rule' | 'document_fonts' | 'link_tag' | 'network';
  localPath?: string;
}

export interface PageRoute {
  url: string;
  title?: string;
  depth: number;
  status?: number;
  metaDescription?: string;
}

export interface StructureResult {
  rootUrl: string;
  sitemaps: string[];
  routes: PageRoute[];
  internalLinksCount: number;
  externalLinksCount: number;
  externalLinks: string[];
}

export interface HeadingItem {
  level: number;
  text: string;
}

export interface TextContent {
  title: string;
  metaDescription?: string;
  canonical?: string;
  language?: string;
  author?: string;
  headings: HeadingItem[];
  markdown: string;
  cleanText: string;
  wordCount: number;
}

export type UIComponentType =
  | 'navbar'
  | 'hero'
  | 'card'
  | 'button'
  | 'form'
  | 'modal'
  | 'footer'
  | 'accordion'
  | 'badge'
  | 'section';

export interface UIComponent {
  id: string;
  name: string;
  type: UIComponentType;
  selector: string;
  tag: string;
  classes: string[];
  computedStyles: {
    display?: string;
    position?: string;
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    borderRadius?: string;
    border?: string;
    padding?: string;
    margin?: string;
    boxShadow?: string;
  };
  html: string;
  jsxSnippet?: string;
  screenshotPath?: string;
}

export interface ScreenshotResult {
  viewport: 'desktop' | 'mobile' | 'tablet' | 'fullpage' | 'custom';
  width: number;
  height: number;
  colorScheme: 'light' | 'dark';
  filePath: string;
  url: string;
}

export interface ParseOptions {
  url: string;
  targets?: ParseTarget[];
  downloadAssets?: boolean;
  outputDir?: string;
  crawlPages?: boolean;
  maxPages?: number;
  maxDepth?: number;
  viewports?: Array<'desktop' | 'mobile' | 'tablet' | 'fullpage'>;
  colorScheme?: 'light' | 'dark' | 'both';
  timeoutMs?: number;
  headers?: Record<string, string>;
  userAgent?: string;
  fastMode?: boolean; // Cheerio only fallback when no dynamic JS/screenshots needed
}

export interface ParseResult {
  url: string;
  timestamp: string;
  durationMs: number;
  targetsParsed: ParseTarget[];
  summary: {
    imagesCount: number;
    videosCount: number;
    models3dCount: number;
    fontsCount: number;
    routesCount: number;
    uiComponentsCount: number;
    screenshotsCount: number;
    wordCount: number;
  };
  assets?: {
    images?: ImageAsset[];
    videos?: VideoAsset[];
    models3d?: Model3DAsset[];
    fonts?: FontAsset[];
  };
  structure?: StructureResult;
  content?: TextContent;
  uiComponents?: UIComponent[];
  screenshots?: ScreenshotResult[];
  downloadManifestPath?: string;
  errors?: string[];
}
