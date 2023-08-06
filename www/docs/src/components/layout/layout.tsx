import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/router";
import { startTransition, useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "../atoms/alert";
import { Button } from "../atoms/button";
import { Prose } from "../prose/prose";
import { ThemeProvider } from "../theme/theme-provider";
import { ThemeSelector } from "../theme/theme-selector";
import { Hero } from "./hero";
import { MobileNavigation } from "./mobile-navigation";
import { Navigation } from "./navigation";
import { Search } from "./search";

// More or less taken from: https://github.com/uidotdev/usehooks/blob/experimental/index.js#L792
// function useLocalStorage(key, initialValue) {
//   const isBrowser = typeof globalThis?.window !== "undefined";
//   const readValue = useCallback(() => {
//     try {
//       const item = window.localStorage.getItem(key);

//       return item ? JSON.parse(item) : initialValue;
//     } catch (_) {
//       return initialValue;
//     }
//   }, [key, initialValue]);
//   const [localState, setLocalState] = useState(readValue);
//   const handleSetState = useCallback(
//     (value) => {
//       try {
//         const nextState =
//           typeof value === "function" ? value(localState) : value;
//         window.localStorage.setItem(key, JSON.stringify(nextState));
//         setLocalState(nextState);
//         window.dispatchEvent(new Event("local-storage"));
//       } catch (e) {
//         console.warn(e);
//       }
//     },
//     [key, localState],
//   );
//   const onStorageChange = useCallback((event) => {
//     if (event?.key && event.key !== key) {
//       return;
//     }

//     setLocalState(readValue());
//   }, []);

//   useEffect(() => {
//     if (isBrowser) {
//       window.addEventListener("storage", onStorageChange);
//       window.addEventListener("local-storage", onStorageChange);

//       return () => {
//         window.removeEventListener("storage", onStorageChange);
//         window.removeEventListener("local-storage", onStorageChange);
//       };
//     }
//   }, [isBrowser]);

//   return [localState, handleSetState];
// }

export const navigation: {
  title: string;
  links: {
    title: string;
    href: string;
  }[];
}[] = [
  {
    title: "Introduction",
    links: [
      { title: "What is Workertown?", href: "/" },
      { title: "Tutorials", href: "/docs/tutorials" },
    ],
  },
  {
    title: "Core concepts",
    links: [
      { title: "Configuration", href: "/docs/core-concepts/configuration" },
      { title: "Routing", href: "/docs/core-concepts/routing" },
      { title: "Authentication", href: "/docs/core-concepts/authentication" },
      { title: "Runtime", href: "/docs/core-concepts/runtime" },
      { title: "Storage", href: "/docs/core-concepts/storage" },
      { title: "Cache", href: "/docs/core-concepts/cache" },
      { title: "Environments", href: "/docs/core-concepts/environments" },
      { title: "REST", href: "/docs/core-concepts/rest" },
    ],
  },
  {
    title: "Search",
    links: [
      {
        title: "Introduction",
        href: "/docs/packages/search/introduction",
      },
      {
        title: "Using the API",
        href: "/docs/packages/search/using-the-api",
      },
      {
        title: "Configuration",
        href: "/docs/packages/search/configuration",
      },
      {
        title: "Storage",
        href: "/docs/packages/search/storage",
      },
      {
        title: "Cache",
        href: "/docs/packages/search/cache",
      },
      {
        title: "Tutorial",
        href: "/docs/packages/search/tutorial",
      },
    ],
  },
  {
    title: "Advanced concepts",
    links: [
      {
        title: "Combining APIs",
        href: "/docs/advanced-concepts/combining-apis",
      },
      { title: "Testing", href: "/docs/advanced-concepts/testing" },
      { title: "Node runtime", href: "/docs/advanced-concepts/node-runtime" },
      { title: "Docker", href: "/docs/advanced-concepts/docker" },
    ],
  },
  {
    title: "Contributing",
    links: [
      {
        title: "How to contribute",
        href: "/docs/contributing/how-to-contribute",
      },
      {
        title: "Architecture guide",
        href: "/docs/contributing/architecture-guide",
      },
      {
        title: "Design principles",
        href: "/docs/contributing/design-principles",
      },
    ],
  },
];

function GitHubIcon(props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" {...props}>
      <title>Github icon</title>
      <path d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z" />
    </svg>
  );
}

function Header({ navigation }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!version) {
      (async () => {
        try {
          const res = await fetch(
            "https://registry.npmjs.org/@workertown/search/latest",
          );

          if (res.ok) {
            const { version } = (await res.json()) as { version: string };

            if (version.includes("alpha") || version.includes("beta")) {
              setVersion(version);
            }
          }
        } catch (_) {}
      })();
    }
  }, [version]);

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 0);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      className={clsx(
        "sticky top-0 z-50 bg-white shadow-md shadow-zinc-900/5 transition duration-500 dark:shadow-none",
        isScrolled
          ? "dark:bg-zinc-900/95 dark:backdrop-blur dark:[@supports(backdrop-filter:blur(0))]:bg-zinc-900/75"
          : "dark:bg-transparent",
      )}
    >
      <div className="flex flex-wrap items-center justify-between m-auto max-w-2xl lg:max-w-8xl px-4 py-5 sm:px-6 lg:px-8 xl:px-12">
        <div className="mr-6 flex lg:hidden">
          <MobileNavigation navigation={navigation} />
        </div>
        <div className="relative flex flex-grow basis-0 items-center">
          <Link href="/" aria-label="Home page">
            <span className="font-display uppercase text-zinc-900 text-xl leading-none dark:text-zinc-50 ">
              W<span className="hidden lg:inline">orker</span>t
              <span className="hidden lg:inline">own</span>
            </span>
          </Link>
        </div>
        <div className="-my-5 mr-6 sm:mr-8 md:mr-0">
          <Search />
        </div>
        <div className="relative flex basis-0 justify-end items-center gap-4 sm:gap-6 md:flex-grow">
          <ThemeSelector />
          <Link
            href="https://github.com/cloudmix-dev/workertown"
            target="_blank"
            className="group"
            aria-label="GitHub"
          >
            <GitHubIcon className="h-6 w-6 fill-zinc-400 group-hover:fill-zinc-500 dark:group-hover:fill-zinc-300" />
          </Link>
        </div>
      </div>
      {version && (
        <div className="flex justify-center items-center px-3 py-1 bg-yellow-400 text-yellow-950 text-xs font-semibold">
          The current version is{" "}
          <span className="ml-1 underline">{version}</span>
        </div>
      )}
    </header>
  );
}

function useTableOfContents(tableOfContents) {
  const [currentSection, setCurrentSection] = useState(tableOfContents[0]?.id);

  const getHeadings = useCallback((tableOfContents) => {
    return tableOfContents
      .flatMap((node) => [node.id, ...node.children.map((child) => child.id)])
      .map((id) => {
        const el = document.getElementById(id);

        if (!el) {
          return;
        }

        const style = window.getComputedStyle(el);
        const scrollMt = parseFloat(style.scrollMarginTop);

        const top = window.scrollY + el.getBoundingClientRect().top - scrollMt;
        return { id, top };
      });
  }, []);

  useEffect(() => {
    if (tableOfContents.length === 0) {
      return;
    }

    const headings = getHeadings(tableOfContents);

    function onScroll() {
      const top = window.scrollY;
      let current = headings[0].id;

      for (const heading of headings) {
        if (top >= heading.top) {
          current = heading.id;
        } else {
          break;
        }
      }

      setCurrentSection(current);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [getHeadings, tableOfContents]);

  return currentSection;
}

export function Layout({ children, title, tableOfContents }) {
  const router = useRouter();
  const isHomePage = router.pathname === "/";
  const allLinks = navigation.flatMap((section) =>
    section.links.map((link) => ({ ...link, section: section.title })),
  );
  const linkIndex = allLinks.findIndex((link) => link.href === router.pathname);
  const previousPage = allLinks[linkIndex - 1];
  const nextPage = allLinks[linkIndex + 1];
  const section = navigation.find((section) =>
    section.links.find((link) => link.href === router.pathname),
  );
  const currentSection = useTableOfContents(tableOfContents);
  const [showWarning, setShowWarning] = useState(false);
  const hideWarning = useCallback(() => {
    setShowWarning(false);
    window.localStorage.setItem("alpha_warning", JSON.stringify(false));
  }, [setShowWarning]);
  const isBrowser = typeof globalThis.window !== "undefined";

  function isActive(section) {
    if (section.id === currentSection) {
      return true;
    }

    if (!section.children) {
      return false;
    }

    return section.children.findIndex(isActive) > -1;
  }

  useEffect(() => {
    if (isBrowser) {
      startTransition(() => {
        if (window.localStorage.getItem("alpha_warning") !== "false") {
          setShowWarning(true);
        }
      });
    }
  }, [isBrowser]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Header navigation={navigation} />
      {isHomePage && <Hero />}
      <div className="relative mx-auto flex max-w-8xl justify-center sm:px-2 lg:px-8 xl:px-12">
        <div className="hidden lg:relative lg:block lg:flex-none">
          <div className="absolute inset-y-0 right-0 w-[50vw] bg-zinc-50 dark:hidden" />
          <div className="absolute bottom-0 right-0 top-16 hidden h-12 w-px bg-gradient-to-t from-zinc-800 dark:block" />
          <div className="absolute bottom-0 right-0 top-28 hidden w-px bg-zinc-800 dark:block" />
          <div className="sticky top-[4.5rem] -ml-0.5 h-[calc(100vh-4.5rem)] w-64 overflow-y-auto overflow-x-hidden py-16 pl-0.5 pr-8 xl:w-72 xl:pr-16">
            <Navigation navigation={navigation} />
          </div>
        </div>
        <div className="min-w-0 max-w-2xl flex-auto px-4 py-16 lg:max-w-none lg:pl-8 lg:pr-0 xl:px-16">
          <article>
            {(title || section) && (
              <header className="mb-9 space-y-1">
                {section && (
                  <p className="font-display text-sm font-medium text-indigo-500">
                    {section.title}
                  </p>
                )}
                {title && (
                  <h1 className="font-display text-3xl tracking-tight text-zinc-900 dark:text-white">
                    {title}
                  </h1>
                )}
              </header>
            )}
            <Prose>{children}</Prose>
          </article>
          <dl className="mt-12 flex border-t border-zinc-200 py-6 dark:border-zinc-800">
            {previousPage && (
              <div>
                <dt className="font-display text-sm font-medium text-zinc-900 dark:text-white">
                  Previous
                </dt>
                <dd className="flex flex-col mt-1">
                  <span className="text-indigo-500 text-xs font-semibold">
                    {previousPage.section}
                  </span>
                  <Link
                    href={previousPage.href}
                    className="text-base font-semibold text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300"
                  >
                    <span aria-hidden="true">&larr;</span> {previousPage.title}
                  </Link>
                </dd>
              </div>
            )}
            {nextPage && (
              <div className="ml-auto text-right">
                <dt className="font-display text-sm font-medium text-zinc-900 dark:text-white">
                  Next
                </dt>
                <dd className="flex flex-col mt-1">
                  <span className="text-indigo-500 text-xs font-semibold">
                    {nextPage.section}
                  </span>
                  <Link
                    href={nextPage.href}
                    className="text-base font-semibold text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300"
                  >
                    {nextPage.title} <span aria-hidden="true">&rarr;</span>
                  </Link>
                </dd>
              </div>
            )}
          </dl>
          <div className="flex justify-center items-center pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">
              See a problem with this page?{" "}
              <Link
                href={`https://github.com/cloudmix-dev/workertown/issues/new?labels=docs&title=Issue+with+docs&body=I+have+found+an+issue+with+the+docs+at+%60${router.pathname}%60&template=docs_issue_template.md`}
                target="_blank"
                className="underline"
              >
                Submit an issue
              </Link>
            </p>
          </div>
        </div>
        <div className="hidden xl:sticky xl:top-[4.5rem] xl:-mr-6 xl:block xl:h-[calc(100vh-4.5rem)] xl:flex-none xl:overflow-y-auto xl:py-16 xl:pr-6">
          <nav aria-labelledby="on-this-page-title" className="w-56">
            {tableOfContents.length > 0 && (
              <>
                <h2
                  id="on-this-page-title"
                  className="font-display text-sm font-medium text-zinc-900 dark:text-white"
                >
                  On this page
                </h2>
                <ol role="list" className="mt-4 space-y-3 text-sm">
                  {tableOfContents.map((section) => (
                    <li key={section.id}>
                      <h3>
                        <Link
                          href={`#${section.id}`}
                          className={clsx(
                            isActive(section)
                              ? "text-indigo-500"
                              : "font-normal text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300",
                          )}
                        >
                          {section.title}
                        </Link>
                      </h3>
                      {section.children.length > 0 && (
                        <ol
                          role="list"
                          className="mt-2 space-y-3 pl-5 text-zinc-500 dark:text-zinc-400"
                        >
                          {section.children.map((subSection) => (
                            <li key={subSection.id}>
                              <Link
                                href={`#${subSection.id}`}
                                className={
                                  isActive(subSection)
                                    ? "text-indigo-500"
                                    : "hover:text-zinc-600 dark:hover:text-zinc-300"
                                }
                              >
                                {subSection.title}
                              </Link>
                            </li>
                          ))}
                        </ol>
                      )}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </nav>
        </div>
      </div>
      {showWarning && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-transparent to-white sm:p-6 dark:to-zinc-900">
          <div className="m-auto max-w-lg">
            <Alert className="bg-zinc-100 shadow-lg dark:bg-zinc-900">
              <AlertTitle className="font-bold">
                Be careful where you tread...
              </AlertTitle>
              <AlertDescription>
                <div className="flex justify-between items-center space-x-4">
                  <p>
                    These docs are very much a work in progress. Check back for
                    regular updates before we launch!
                  </p>
                  <Button
                    size="sm"
                    onClick={hideWarning}
                    className="flex-shrink-0"
                  >
                    Got it
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}
    </ThemeProvider>
  );
}
