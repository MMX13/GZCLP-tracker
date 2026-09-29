// Keyframes for creature animation. Injected once as a <style> element.
export const ART_CSS = `
.fg-art{overflow:visible;transform-origin:50% 92%;display:inline-block;vertical-align:bottom;animation:fg-art-breathe 3s ease-in-out infinite;animation-delay:var(--fg-d,0s)}
.fg-art-hit{animation:fg-art-hit .38s ease-out 1}
.fg-art-attack-l{animation:fg-art-lunge-l .45s cubic-bezier(.3,1.6,.5,1) 1}
.fg-art-attack-r{animation:fg-art-lunge-r .45s cubic-bezier(.3,1.6,.5,1) 1}
.fg-art-dead{animation:fg-art-dead .6s ease-in forwards}
@keyframes fg-art-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.035,.95)}}
@keyframes fg-art-hit{0%{transform:translateX(0) scale(1,1);filter:brightness(1)}15%{transform:translateX(var(--fg-kb,8px)) scale(.9,1.08);filter:brightness(3) saturate(0)}45%{transform:translateX(calc(var(--fg-kb,8px)*-.4)) scale(1.05,.95);filter:brightness(1.6)}100%{transform:translateX(0) scale(1,1);filter:brightness(1)}}
@keyframes fg-art-lunge-l{0%{transform:translateX(0) scale(1,1)}25%{transform:translateX(10%) scale(1.06,.9)}55%{transform:translateX(-38%) scale(.94,1.08)}100%{transform:translateX(0) scale(1,1)}}
@keyframes fg-art-lunge-r{0%{transform:translateX(0) scale(1,1)}25%{transform:translateX(-10%) scale(1.06,.9)}55%{transform:translateX(38%) scale(.94,1.08)}100%{transform:translateX(0) scale(1,1)}}
@keyframes fg-art-dead{0%{transform:scale(1,1);opacity:1;filter:brightness(1)}25%{transform:scale(1.1,.85);filter:brightness(2.5) saturate(0)}100%{transform:scale(1.25,.08);opacity:0;filter:brightness(1)}}
.fg-art-pop{animation:fg-art-pop .3s ease-out 1}
@keyframes fg-art-pop{0%{transform:scale(.6)}70%{transform:scale(1.15)}100%{transform:scale(1)}}
@media (prefers-reduced-motion:reduce){.fg-art,.fg-art-pop{animation:none!important}.fg-art-hit{animation:fg-art-hit-rm .3s linear 1!important}.fg-art-attack-l,.fg-art-attack-r{animation:none!important}.fg-art-dead{animation:fg-art-dead-rm .4s linear forwards!important}
@keyframes fg-art-hit-rm{0%{filter:brightness(2.5)}100%{filter:brightness(1)}}@keyframes fg-art-dead-rm{to{opacity:0}}}
`;
