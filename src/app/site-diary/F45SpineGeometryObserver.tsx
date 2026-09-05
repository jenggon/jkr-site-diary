'use client';

import React, { useLayoutEffect, useRef } from 'react';

const STEP_KEYS = ['source', 'daily', 'site', 'weather', 'workforce', 'notes', 'save'] as const;

type StepKey = (typeof STEP_KEYS)[number];

function resolveAnchor(step: HTMLElement, key: StepKey): HTMLElement {
  if (key === 'source') {
    return step.querySelector<HTMLElement>(
      '.ng-entry-heading, .mobile-entry-spike-panel h3, .mobile-entry-selected-source h3, h3',
    ) ?? step;
  }
  if (key === 'save') return step.querySelector<HTMLElement>('.ng-save-action') ?? step;
  return step.querySelector<HTMLElement>('.ng-entry-heading') ?? step;
}

export default function F45SpineGeometryObserver() {
  const markerRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    const marker = markerRef.current;
    const form = marker?.closest<HTMLFormElement>("form[data-ui-authority='F45']");
    if (!form) return;

    let frame = 0;

    const measure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const steps = STEP_KEYS.map((key) =>
          form.querySelector<HTMLElement>(`:scope > .ng-entry-step[data-entry-step="${key}"]`),
        );
        if (steps.some((step) => !step)) return;

        const formRect = form.getBoundingClientRect();
        const centres: number[] = [];

        STEP_KEYS.forEach((key, index) => {
          const step = steps[index];
          if (!step) return;
          const anchor = resolveAnchor(step, key);
          const stepRect = step.getBoundingClientRect();
          const anchorRect = anchor.getBoundingClientRect();
          const absoluteCentre = anchorRect.top + (anchorRect.height / 2);
          const nodeCentreWithinStep = absoluteCentre - stepRect.top;
          const nodeCentreWithinForm = absoluteCentre - formRect.top;

          step.style.setProperty('--ng-spine-node-y', `${nodeCentreWithinStep}px`);
          centres.push(nodeCentreWithinForm);
        });

        if (centres.length !== STEP_KEYS.length) return;
        const railTop = centres[0];
        const railEnd = centres.at(-1);
        if (railTop == null || railEnd == null) return;

        form.style.setProperty('--ng-spine-rail-top', `${railTop}px`);
        form.style.setProperty('--ng-spine-rail-height', `${Math.max(0, railEnd - railTop)}px`);
        form.dataset.spineGeometry = 'measured';
      });
    };

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(form);
    form.querySelectorAll<HTMLElement>(':scope > .ng-entry-step[data-entry-step]').forEach((step) => {
      resizeObserver.observe(step);
    });

    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(form, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'data-spine-state', 'aria-expanded'],
    });

    window.addEventListener('resize', measure);
    measure();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      form.removeAttribute('data-spine-geometry');
      form.style.removeProperty('--ng-spine-rail-top');
      form.style.removeProperty('--ng-spine-rail-height');
      form.querySelectorAll<HTMLElement>(':scope > .ng-entry-step[data-entry-step]').forEach((step) => {
        step.style.removeProperty('--ng-spine-node-y');
      });
    };
  }, []);

  return <span ref={markerRef} hidden aria-hidden="true" data-f45-spine-observer />;
}
