// Agent Runner DSH Client Hook (OpenDesign External CLI Runner Architecture)
window.__ModuleLoader__.load({
  id: 'dsh-agent-runner',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const PANEL_ID = 'agent-runner';
    const PAGE_URL = '/api/agent-runner/ui';

    // Sidebar Icon
    function PanelIcon({ size, active }) {
      const s = size || 18;
      return h('svg', {
        width: s,
        height: s,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        style: { display: 'block', opacity: active ? 1 : 0.7 }
      },
        h('rect', { x: 2, y: 3, width: 20, height: 14, rx: 2 }),
        h('line', { x1: 8, y1: 21, x2: 16, y2: 21 }),
        h('line', { x1: 12, y1: 17, x2: 12, y2: 21 }),
        h('polyline', { points: '6 8 10 10 6 12' }),
        h('line', { x1: 12, y1: 12, x2: 16, y2: 12 })
      );
    }

    function Panel() {
      return h('iframe', {
        title: 'Agent Runner',
        src: PAGE_URL,
        style: {
          width: '100%',
          height: '100%',
          border: 0,
          display: 'block',
          backgroundColor: '#0f172a'
        }
      });
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        try {
          ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 850,
              label: 'Agent Runner'
            },
            PanelIcon
          ));
        } catch (e) {
          console.error('[agent-runner] Sidebar registration failed:', e);
        }

        try {
          ctx.slots.inject('main', () => ctx.slots.register(
            {
              name: 'main',
              key: PANEL_ID
            },
            Panel
          ));
        } catch (e) {
          console.error('[agent-runner] Main panel registration failed:', e);
        }
      }
    };
  }
});
