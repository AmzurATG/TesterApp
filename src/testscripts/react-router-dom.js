module.exports = {
  useNavigate: () => jest.fn(),
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
  }),
  useParams: () => ({}),
  BrowserRouter: ({ children }) => children,
  Routes: ({ children }) => children,
  Route: ({ children }) => children,
  Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
  Navigate: () => null,
};
