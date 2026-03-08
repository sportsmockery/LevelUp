import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const STOCKIQ_DOMAIN = 'stockiqdash.com';

const PROTECTED_ROUTES = [
  '/admin',
  '/dashboard',
  '/coach',
  '/profile',
  '/onboarding',
  '/tradingview',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const isStockIQDomain = hostname.replace('www.', '').startsWith(STOCKIQ_DOMAIN);

  // --- StockIQ domain routing ---
  if (isStockIQDomain) {
    // Allow API routes, _next assets, and login through
    if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname === '/login') {
      return NextResponse.next();
    }

    // Root of stockiqdash.com → rewrite to /tradingview (URL stays as /)
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/tradingview';
      return await checkAuth(request, url, '/');
    }

    // /tradingview on stockiqdash.com → auth check then serve
    if (pathname === '/tradingview') {
      return await checkAuth(request, null, '/tradingview');
    }

    // Any other path on stockiqdash.com → redirect to root
    const url = new URL('/', request.url);
    return NextResponse.redirect(url);
  }

  // --- Standard levelupwrestlingapp.com routing ---
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  );

  if (!isProtected) return NextResponse.next();

  return await checkAuth(request, null, pathname);
}

async function checkAuth(
  request: NextRequest,
  rewriteUrl: URL | null,
  redirectPath: string,
): Promise<NextResponse> {
  let response = rewriteUrl
    ? NextResponse.rewrite(rewriteUrl)
    : NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = rewriteUrl
          ? NextResponse.rewrite(rewriteUrl, { request })
          : NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', redirectPath);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and images.
     * This is needed so stockiqdash.com root (/) gets intercepted.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
