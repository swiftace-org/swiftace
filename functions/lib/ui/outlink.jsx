const { default: jsx } = require("lib/utils/jsx");

export const Outlink = ({ href, children }) => (
  <a href={href} rel="noopener noreferrer nofollow" target="_blank" class="link">
    {children}
  </a>
);