function getApi() {
  if (!window.matchFramer) {
    throw new Error('Match Framer desktop bridge is not available. Run the Electron app.');
  }

  return window.matchFramer;
}

export { getApi };
