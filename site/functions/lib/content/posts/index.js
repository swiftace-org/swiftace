import featuresContent from "./features.md.txt";
import authenticationContent from "./authentication.md.txt";
import form1Content from "./anatomy-of-a-form-part-1.md.txt";
import ditchingServerlessContent from "./ditching-serverless.md.txt";
import designPrinciplesContent from "./design-principles.md.txt";
import shipOfTheseusContent from "./ship-of-theseus.md.txt";
import howToWriteAFunctionContent from "./how-to-write-a-function.md.txt";
import denoContent from "./switching-to-deno.md.txt";
import jsxRuntimeContent from "./jsx-runtime.md.txt";
import deployWebAppContent from "./deploy-web-app-to-cloud-vm.md.txt";
import typescriptContent from "./typescript.md.txt";
import softwareContent from "./software.md.txt";
import deleteContent from "./delete.md.txt";
import subscriptionsContent from "./subscriptions.md.txt";
import genaiContent from "./genai.md.txt";
import webdevContent from "./webdev.md.txt";
import slackContent from "./slack.md.txt";
import entrepreneurshipContent from "./entrepreneurship.md.txt";
import workContent from "./work.md.txt";
import whatWhyHowContent from "./what-why-and-how.md.txt";
import cloudCostsContent from "./cutting-cloud-computing-costs-by-100x.md.txt";
import howToStackPullRequestsContent from "./how-to-stack-pull-requests.md.txt";
import pastPresentAndFutureOfJovianContent from "./past-present-and-future-of-jovian.md.txt";
import remoteDevContent from "./remote-development-environment-setup.md.txt";
import nextjsProjectStructureContent from "./how-to-structure-a-nextjs-application.md.txt";
import tanstackStartPart1Content from "./tanstack-start-part-1.md.txt";
import tanstackStartPart2Content from "./tanstack-start-part-2.md.txt";
import tanstackStartPart3Content from "./tanstack-start-part-3.md.txt";
import setUpPostgresOnCloudVmContent from "./set-up-postgres-on-cloud-vm.md.txt";
import macosTerminalSetupContent from "./macos-terminal-setup.md.txt";
import largeScaleRefactoringContent from "./large-scale-code-refactoring-with-ai.md.txt";

function extractTitle(content) {
  const firstLineBreak = content.indexOf("\n");
  const firstLine = content.substr(0, firstLineBreak).trim();
  if (!firstLine) throw new Error("First line must not be empty");
  if (!firstLine.startsWith("# ")) {
    throw new Error("First line must start with '# '");
  }
  return firstLine.substr(2);
}

function extractBody(content) {
  const firstLineBreak = content.indexOf("\n");
  return content.substr(firstLineBreak).trim();
}

export const posts = [
  {
    slug: "large-scale-code-refactoring-with-ai",
    author: "Aakash N S",
    title: extractTitle(largeScaleRefactoringContent),
    date: "Aug 9, 2026",
    content: extractBody(largeScaleRefactoringContent),
  },
  {
    slug: "macos-terminal-setup",
    author: "Aakash N S",
    title: extractTitle(macosTerminalSetupContent),
    date: "Jun 15, 2026",
    content: extractBody(macosTerminalSetupContent),
  },
  {
    slug: "set-up-postgres-on-cloud-vm",
    author: "Aakash N S",
    title: extractTitle(setUpPostgresOnCloudVmContent),
    date: "May 15, 2026",
    content: extractBody(setUpPostgresOnCloudVmContent),
  },
  {
    slug: "tanstack-start-part-3",
    author: "Aakash N S",
    title: extractTitle(tanstackStartPart3Content),
    date: "Apr 14, 2026",
    content: extractBody(tanstackStartPart3Content),
  },
  {
    slug: "tanstack-start-part-2",
    author: "Aakash N S",
    title: extractTitle(tanstackStartPart2Content),
    date: "Apr 11, 2026",
    content: extractBody(tanstackStartPart2Content),
  },
  {
    slug: "tanstack-start-part-1",
    author: "Aakash N S",
    title: extractTitle(tanstackStartPart1Content),
    date: "Mar 27, 2026",
    content: extractBody(tanstackStartPart1Content),
  },
  {
    slug: "how-to-structure-a-nextjs-application",
    author: "Aakash N S",
    title: extractTitle(nextjsProjectStructureContent),
    date: "Jan 6, 2026",
    content: extractBody(nextjsProjectStructureContent),
  },
  {
    slug: "past-present-and-future-of-jovian",
    author: "Aakash N S",
    title: extractTitle(pastPresentAndFutureOfJovianContent),
    date: "Nov 23, 2025",
    content: extractBody(pastPresentAndFutureOfJovianContent),
  },
  {
    slug: "remote-development-environment-setup",
    author: "Aakash N S",
    title: extractTitle(remoteDevContent),
    date: "May 26, 2025",
    content: extractBody(remoteDevContent),
  },
  {
    slug: "how-to-stack-pull-requests",
    author: "Aakash N S",
    title: extractTitle(howToStackPullRequestsContent),
    date: "May 11, 2025",
    content: extractBody(howToStackPullRequestsContent),
  },
  {
    slug: "cutting-cloud-computing-costs-by-100x",
    author: "Aakash N S",
    title: extractTitle(cloudCostsContent),
    date: "Jan 28, 2025",
    content: extractBody(cloudCostsContent),
  },
  {
    slug: "what-why-and-how",
    author: "Aakash N S",
    title: extractTitle(whatWhyHowContent),
    date: "Jan 12, 2025",
    content: extractBody(whatWhyHowContent),
  },
  {
    slug: "deploy-web-app-to-cloud-vm",
    author: "Aakash N S",
    title: extractTitle(deployWebAppContent),
    date: "Nov 16, 2024",
    content: extractBody(deployWebAppContent),
  },
  {
    slug: "jsx-runtime",
    author: "Aakash N S",
    title: extractTitle(jsxRuntimeContent),
    date: "Oct 25, 2024",
    content: extractBody(jsxRuntimeContent),
  },
  {
    slug: "switching-to-deno",
    author: "Aakash N S",
    title: extractTitle(denoContent),
    date: "Oct 18, 2024",
    content: extractBody(denoContent),
  },
  {
    slug: "how-to-write-a-function",
    author: "Aakash N S",
    title: extractTitle(howToWriteAFunctionContent),
    date: "Oct 14, 2024",
    content: extractBody(howToWriteAFunctionContent),
  },
  {
    slug: "ship-of-theseus",
    author: "Aakash N S",
    title: extractTitle(shipOfTheseusContent),
    date: "Sep 30, 2024",
    content: extractBody(shipOfTheseusContent),
  },
  {
    slug: "design-principles",
    author: "Aakash N S",
    title: extractTitle(designPrinciplesContent),
    date: "Aug 31, 2024",
    content: extractBody(designPrinciplesContent),
  },
  {
    slug: "ditching-serverless",
    author: "Aakash N S",
    title: extractTitle(ditchingServerlessContent),
    date: "Aug 28, 2024",
    content: extractBody(ditchingServerlessContent),
  },
  {
    slug: "anatomy-of-a-form-part-1",
    author: "Aakash N S",
    title: extractTitle(form1Content),
    date: "Jun 27, 2024",
    content: extractBody(form1Content),
  },
  {
    slug: "authentication",
    author: "Aakash N S",
    title: extractTitle(authenticationContent),
    date: "May 16, 2024",
    content: extractBody(authenticationContent),
  },
  {
    slug: "features",
    author: "Aakash N S",
    title: extractTitle(featuresContent),
    date: "May 15, 2024",
    content: extractBody(featuresContent),
    hidden: true,
  },
];

export const beforePosts = [
  {
    slug: "entrepreneurship",
    author: "Aakash N S",
    title: extractTitle(entrepreneurshipContent),
    date: "March 15, 2024",
    content: extractBody(entrepreneurshipContent),
  },
  {
    slug: "typescript",
    author: "Aakash N S",
    title: extractTitle(typescriptContent),
    date: "February 27, 2024",
    content: extractBody(typescriptContent),
  },
  {
    slug: "software",
    author: "Aakash N S",
    title: extractTitle(softwareContent),
    date: "February 9, 2024",
    content: extractBody(softwareContent),
  },
  {
    slug: "delete",
    author: "Aakash N S",
    title: extractTitle(deleteContent),
    date: "December 13, 2023",
    content: extractBody(deleteContent),
  },
  {
    slug: "subscriptions",
    author: "Aakash N S",
    title: extractTitle(subscriptionsContent),
    date: "December 7, 2023",
    content: extractBody(subscriptionsContent),
  },
  {
    slug: "genai",
    author: "Aakash N S",
    title: extractTitle(genaiContent),
    date: "November 28, 2023",
    content: extractBody(genaiContent),
  },
  {
    slug: "webdev",
    author: "Aakash N S",
    title: extractTitle(webdevContent),
    date: "April 28, 2023",
    content: extractBody(webdevContent),
  },
  {
    slug: "slack",
    author: "Aakash N S",
    title: extractTitle(slackContent),
    date: "December 2, 2022",
    content: extractBody(slackContent),
    hidden: true,
  },
  {
    slug: "work",
    author: "Aakash N S",
    title: extractTitle(workContent),
    date: "February 13, 2022",
    content: extractBody(workContent),
    hidden: true,
  },
];
