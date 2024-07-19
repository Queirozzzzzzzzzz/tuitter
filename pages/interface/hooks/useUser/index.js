import { useRouter } from "next/router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const userEndpoint = "/api/v1/user";
const sessionEndpoint = "/api/v1/sessions";

const UserContext = createContext({
  user: null,
  isLoading: true,
  error: undefined,
  fetchUser: async () => {},
  logout: async () => {},
});

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(undefined);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(userEndpoint);
      const resBody = await res.json();

      if (res.status === 200) {
        const fetchedUser = resBody;

        const cachedUserProperties = {
          id: resBody.id,
          tag: resBody.tag,
          username: resBody.username,
          features: resBody.features,
          cacheTime: Date.now(),
        };

        setUser(fetchedUser);
        localStorage.setItem("user", JSON.stringify(cachedUserProperties));
      } else if ([401, 403].includes(res.status) && !resBody?.blocked) {
        setUser(null);
        localStorage.removeItem("user");
      } else {
        const err = new Error(resBody.message);
        err.status = res.status;
        throw err;
      }
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    (async () => {
      if (storedUser && isLoading) {
        setUser(JSON.parse(storedUser));
        await fetchUser();
      }
      setIsLoading(false);
    })();

    if (isLoading) return;

    function onFocus() {
      const cachedUser = JSON.parse(localStorage.getItem("user"));
      setUser((user) =>
        cachedUser?.username ? { ...user, ...cachedUser } : null,
      );
      fetchUser();
    }
    addEventListener("focus", onFocus);

    return () => removeEventListener("focus", onFocus);
  }, [fetchUser, isLoading]);

  useEffect(() => {
    if (
      !user?.id ||
      (router?.pathname !== "/login" && router?.pathname !== "/signup")
    )
      return;

    if (
      router.query?.redirect?.startsWith("/") &&
      !router.query?.redirect?.startsWith("/login") &&
      !router.query?.redirect?.startsWith("/signup")
    ) {
      router.replace(router.query.redirect);
    } else {
      router.replace(`/`);
    }
  }, [user, router]);

  const logout = useCallback(async () => {
    try {
      const res = await fetch(sessionEndpoint, {
        method: "DELETE",
      });

      if (res.status === 200) {
        localStorage.clear();
        setUser(null);
      }
    } catch (err) {
      setError(err);
    }
  }, []);

  const userContextValue = {
    user,
    isLoading,
    error,
    fetchUser,
    logout,
  };

  return (
    <UserContext.Provider value={userContextValue}>
      {children}
    </UserContext.Provider>
  );
}

export default function useUser() {
  return useContext(UserContext);
}
