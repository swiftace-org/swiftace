interface Route {
  path: string;
  method: string | string[];
  handler: (...args: any[]) => any;
}

interface MatchResult {
  handler?: (...args: any[]) => any;
  params?: Record<string, string | string[]>;
}

interface MatchRouteOptions {
  routes: Route[];
  path: string;
  method: string;
}

interface CoreServer {
  fetch(req: Request): Promise<Response>;
  routes: Route[];
  extensionContentTypes: Record<string, string>;
  isPublicFilePath(path: string): RegExpMatchArray | null;
  servePublicFile(
    scope: string,
    project: string,
    filePath: string,
  ): Promise<Response>;
  Nav(): any[];
  homePage(): any[];
  aboutPage(): any[];
  getContentType(filePath: string): string;
  matchRoute(options: MatchRouteOptions): MatchResult;
  dirname: string;
}

declare const coreServer: CoreServer;
export default coreServer;
