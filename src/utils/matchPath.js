export function matchPath(pattern, path) {
  const regex = new RegExp(`^${pattern.replace(/:\w+/g, '[^/]+')}$`);
  return regex.test(path);
}
