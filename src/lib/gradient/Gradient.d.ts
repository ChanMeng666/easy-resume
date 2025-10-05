/**
 * Type definitions for Stripe Gradient Animation
 * Based on https://kevinhufnagl.com
 */

/**
 * Gradient class for WebGL-based animated gradient backgrounds
 */
export class Gradient {
  /**
   * Create a new Gradient instance
   */
  constructor();

  /**
   * Initialize the gradient with a canvas selector
   * @param selector CSS selector for the canvas element
   */
  initGradient(selector: string): void;

  /**
   * Pause the gradient animation
   */
  pause(): void;

  /**
   * Resume the gradient animation
   */
  play(): void;

  /**
   * Amplitude of the gradient animation
   */
  amp: number;

  /**
   * Colors used in the gradient
   */
  sectionColors: number[][];
}
