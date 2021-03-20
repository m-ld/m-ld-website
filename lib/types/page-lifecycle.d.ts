declare module 'page-lifecycle' {
  type State = 'active' | 'passive' | 'hidden' | 'frozen' | 'terminated';

  /**
   * The statechange event is fired whenever the page's lifecycle state changes.
   */
  interface StateChange {
    /**
     * The current lifecycle state the page just transitioned to.
     */
    newState: State;
    /**
     * The previous lifecycle state the page just transitioned from.
     */
    oldState: State;
    /**
     * The DOM event that triggered the state change.
     */
    originalEvent: Event;
  }

  class Lifecycle {
    /**
     * Returns the current Page Lifecycle state.
     */
    state: State;
    /**
     * Returns the value of `document.wasDiscarded` (or false if not present).
     */
    pageWasDiscarded: boolean;
    /**
     * Adds a callback function to be invoked whenever the passed event type is
     * detected.
     */
    addEventListener(type: 'statechange', listener: (event: StateChange) => void): void;
    /**
     * Removes a function from the current list of listeners for the passed
     * event type.
     */
    removeEventListener(type: 'statechange', listener: (event: StateChange) => void): void;
    /**
     * Adds an item to an internal pending-changes stack. Calling this method
     * adds a generic `beforeunload` listener to the window (if one isn't already
     * added).
     *
     * The argument passed should be unique to this state, as it can only be
     * removed by passing the same argument to `removeUnsavedChanges()`.
     */
    addUnsavedChanges(id: Object | Symbol): void;
    /**
     * Removes an item matching the passed argument from an internal
     * pending-changes stack. If the stack is empty, the generic `beforeunload`
     * listener is removed from the window.
     */
    removeUnsavedChanges(id: Object | Symbol): void;
  }

  const lifecycle: Lifecycle;
  export = lifecycle;
}