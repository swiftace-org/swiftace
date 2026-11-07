import { createCsrfMiddleware, createStart } from "@tanstack/react-start"

import { errorTrackingMiddleware, errorTrackingRequestMiddleware } from "@/lib/utils"

export const startInstance = createStart(() => ({
  requestMiddleware: [
    // Start only adds its CSRF check when this file is absent, so it has to be restated here.
    createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === "serverFn" }),
    errorTrackingRequestMiddleware,
  ],
  functionMiddleware: [errorTrackingMiddleware],
}))
