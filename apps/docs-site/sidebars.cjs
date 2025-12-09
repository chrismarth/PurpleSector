/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {

  userGuide: [
    'intro',
    {
      type: 'category',
      label: 'User Guide',
      collapsed: false,
      items: [
        'user/getting-started',
        'user/using-sessions',
        'user/telemetry-collectors',
        'user/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'Operations',
      collapsed: false,
      items: [
        'ops/running-stack',
        'ops/deployment',
        'ops/monitoring',
      ],
    },
    {
      type: 'category',
      label: 'Developer Guide',
      collapsed: false,
      items: [
        'dev/architecture',
        'dev/monorepo-structure',
        'dev/dev-environment',
        'dev/database-and-telemetry',
        'dev/acc-telemetry',
        'dev/acc-hybrid-collector',
        'dev/langgraph-analyzer',
        'dev/plot-layouts',
      ],
    },
    {
      type: 'category',
      label: 'Design Notes',
      collapsed: false,
      items: [
        'notes/overview',
      ],
    },
  ],
};

module.exports = sidebars;
