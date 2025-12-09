import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/PurpleSector/',
    component: ComponentCreator('/PurpleSector/', 'a53'),
    exact: true
  },
  {
    path: '/PurpleSector/',
    component: ComponentCreator('/PurpleSector/', '947'),
    routes: [
      {
        path: '/PurpleSector/',
        component: ComponentCreator('/PurpleSector/', 'e58'),
        routes: [
          {
            path: '/PurpleSector/',
            component: ComponentCreator('/PurpleSector/', 'f2a'),
            routes: [
              {
                path: '/PurpleSector/dev/acc-hybrid-collector',
                component: ComponentCreator('/PurpleSector/dev/acc-hybrid-collector', '37f'),
                exact: true,
                sidebar: "userGuide"
              },
              {
                path: '/PurpleSector/dev/acc-telemetry',
                component: ComponentCreator('/PurpleSector/dev/acc-telemetry', 'db3'),
                exact: true,
                sidebar: "userGuide"
              },
              {
                path: '/PurpleSector/dev/architecture',
                component: ComponentCreator('/PurpleSector/dev/architecture', 'f40'),
                exact: true,
                sidebar: "userGuide"
              },
              {
                path: '/PurpleSector/dev/database-and-telemetry',
                component: ComponentCreator('/PurpleSector/dev/database-and-telemetry', 'a03'),
                exact: true,
                sidebar: "userGuide"
              },
              {
                path: '/PurpleSector/dev/dev-environment',
                component: ComponentCreator('/PurpleSector/dev/dev-environment', 'bd5'),
                exact: true,
                sidebar: "userGuide"
              },
              {
                path: '/PurpleSector/dev/langgraph-analyzer',
                component: ComponentCreator('/PurpleSector/dev/langgraph-analyzer', '8a6'),
                exact: true,
                sidebar: "userGuide"
              },
              {
                path: '/PurpleSector/dev/monorepo-structure',
                component: ComponentCreator('/PurpleSector/dev/monorepo-structure', 'fbf'),
                exact: true,
                sidebar: "userGuide"
              },
              {
                path: '/PurpleSector/dev/plot-layouts',
                component: ComponentCreator('/PurpleSector/dev/plot-layouts', '57d'),
                exact: true,
                sidebar: "userGuide"
              },
              {
                path: '/PurpleSector/intro',
                component: ComponentCreator('/PurpleSector/intro', 'd68'),
                exact: true,
                sidebar: "userGuide"
              },
              {
                path: '/PurpleSector/notes/overview',
                component: ComponentCreator('/PurpleSector/notes/overview', '812'),
                exact: true,
                sidebar: "userGuide"
              },
              {
                path: '/PurpleSector/ops/deployment',
                component: ComponentCreator('/PurpleSector/ops/deployment', 'dcb'),
                exact: true,
                sidebar: "userGuide"
              },
              {
                path: '/PurpleSector/ops/monitoring',
                component: ComponentCreator('/PurpleSector/ops/monitoring', '9bd'),
                exact: true,
                sidebar: "userGuide"
              },
              {
                path: '/PurpleSector/ops/running-stack',
                component: ComponentCreator('/PurpleSector/ops/running-stack', '17b'),
                exact: true,
                sidebar: "userGuide"
              },
              {
                path: '/PurpleSector/user/getting-started',
                component: ComponentCreator('/PurpleSector/user/getting-started', 'a7a'),
                exact: true,
                sidebar: "userGuide"
              },
              {
                path: '/PurpleSector/user/telemetry-collectors',
                component: ComponentCreator('/PurpleSector/user/telemetry-collectors', '616'),
                exact: true,
                sidebar: "userGuide"
              },
              {
                path: '/PurpleSector/user/troubleshooting',
                component: ComponentCreator('/PurpleSector/user/troubleshooting', '703'),
                exact: true,
                sidebar: "userGuide"
              },
              {
                path: '/PurpleSector/user/using-sessions',
                component: ComponentCreator('/PurpleSector/user/using-sessions', 'a2d'),
                exact: true,
                sidebar: "userGuide"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
