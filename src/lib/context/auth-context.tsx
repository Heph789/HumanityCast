import { getRandomId } from '@lib/random';
import type { Bookmark } from '@lib/types/bookmark';
import type { UserFull, UserFullResponse, UserResponse } from '@lib/types/user';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { WarpcastSignInModal } from '../../components/modal/sign-in-modal-warpcast';
import { fetchJSON } from '../fetch';
import { useModal } from '../hooks/useModal';
import {
  ACTIVE_KEYPAIR_KEY,
  addKeyPair,
  getActiveKeyPair,
  getKeyPairs,
  removeKeyPair,
  setKeyPair
} from '../keys';
import { KeyPair } from '../types/keypair';
import { NotificationsResponseSummary } from '../types/notifications';
import { useRouter } from 'next/router';

export type UserWithKey = UserFull & { keyPair?: KeyPair };

type AuthContext = {
  user: UserWithKey | null;
  usersWithKeys: UserWithKey[];
  error: Error | null;
  loading: boolean;
  isAdmin: boolean;
  randomSeed: string;
  userBookmarks: Bookmark[] | null;
  userNotifications: number | null;
  lastCheckedNotifications: Date | null;
  timelineCursor: Date | null;
  setTimelineCursor: (date: Date | null) => void;
  signOut: () => Promise<void>;
  showAddAccountModal: () => void;
  setUser: (user: UserWithKey) => void;
  handleUserAuth: (forceKeyPair?: KeyPair) => void;
  resetNotifications: () => void;
};

export const AuthContext = createContext<AuthContext | null>(null);

type AuthContextProviderProps = {
  children: ReactNode;
};

export function AuthContextProvider({
  children
}: AuthContextProviderProps): JSX.Element {
  const router = useRouter();

  const [user, setUser] = useState<UserWithKey | null>(null);
  const [users, setUsers] = useState<UserWithKey[]>([]);
  const [userBookmarks, setUserBookmarks] = useState<Bookmark[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const modal = useModal();

  const [lastCheckedNotifications, setLastCheckedNotifications] =
    useState<Date | null>(null);

  const [timelineCursor, setTimelineCursor] = useState<Date | null>(null);

  /**
   * Key storage explainer:
   * 'keyPair' storage is used to store the key pair of the currently signed in user.
   * 'keyPairs' storage is used to store all key pairs that have been used to sign in.
   */

  const fetchUserForKey = async (
    keyPair: KeyPair
  ): Promise<UserFull | null> => {
    const { result: user } = await fetchJSON<UserFullResponse>(
      `/api/signer/${keyPair.publicKey}/user`
    );
    return (user as UserFull) || null;
  };

  const manageUser = async ({
    keyPair,
    id
  }: {
    keyPair?: KeyPair;
    id?: string;
  }): Promise<void> => {
    let fetchedUser: UserFull | null = null;
    if (keyPair) {
      fetchedUser = await fetchUserForKey(keyPair);
    } else if (id) {
      const { result } = await fetchJSON<UserResponse>(`/api/user/${id}`);
      fetchedUser = result as UserFull;
    }

    if (fetchedUser) setUser({ ...fetchedUser, keyPair });

    setLoading(false);
  };

  /**
   * Updates users and current user
   * @param forceKeyPair Force a key pair to be set as the current user
   */
  const handleUserAuth = async (forceKeyPair?: KeyPair): Promise<void> => {
    setLoading(true);

    // Get signer from local storage
    if (forceKeyPair) {
      setKeyPair(forceKeyPair);
    }

    let keyPair = forceKeyPair || (await getActiveKeyPair());
    const keyPairs = await getKeyPairs();

    if (keyPair) {
      void manageUser({ keyPair });
    } else {
      // Default to fid 3 view-only account
      void manageUser({ id: '3' });
      return;
    }

    // Add key pair to storage in case it's not already there
    addKeyPair(keyPair);

    // Fetch users for all key pairs
    Promise.all(keyPairs.map(fetchUserForKey)).then((users) => {
      const usersWithKeys = users
        .map((user, index) =>
          user ? { ...user, keyPair: keyPairs[index] } : null
        )
        .filter((user) => user !== null);
      setUsers(usersWithKeys as UserWithKey[]);
    });

    // Go to /home if user is on /login
    if (router.pathname === '/login' || router.pathname === '/')
      router.push('/home');
  };

  useEffect(() => {
    // `user` is changed by the user selection menu
    // When it changes we need to update the current user in local storage
    if (user?.keyPair) {
      getActiveKeyPair().then((activeKeyPair) => {
        if (
          (!activeKeyPair ||
            activeKeyPair.publicKey !== user.keyPair?.publicKey) &&
          user.keyPair
        ) {
          setKeyPair(user.keyPair);
        }
      });
    }
  }, [user]);

  useEffect(() => {
    handleUserAuth();
    setLastCheckedNotifications(
      new Date(localStorage.getItem('lastChecked') || new Date().toISOString())
    );
    setTimelineCursor(new Date());
  }, []);

  const signOut = async (): Promise<void> => {
    try {
      const keyPair = await getActiveKeyPair();
      if (!keyPair) throw new Error('No key pair found');

      localStorage.removeItem(ACTIVE_KEYPAIR_KEY);
      removeKeyPair(keyPair);
      handleUserAuth();
    } catch (error) {
      setError(error as Error);
    }
  };

  const isAdmin = false;
  const randomSeed = useMemo(getRandomId, [user?.id]);

  const { data: userNotifications, isValidating: loadingNotifications } =
    useSWR(
      router.pathname !== '/notifications' &&
        user?.keyPair &&
        lastCheckedNotifications
        ? `/api/user/${
            user.id
          }/notifications?last_time=${lastCheckedNotifications.toISOString()}`
        : null,
      async (url) =>
        (await fetchJSON<NotificationsResponseSummary>(url)).result,
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        refreshWhenHidden: true,
        refreshInterval: 10000 // Poll every 10 seconds
      }
    );

  const resetNotifications = (): void => {
    setLastCheckedNotifications(new Date());
  };

  useEffect(() => {
    if (lastCheckedNotifications)
      localStorage.setItem(
        'lastChecked',
        lastCheckedNotifications.toISOString()
      );
  }, [lastCheckedNotifications]);

  const value: AuthContext = {
    user,
    usersWithKeys: users,
    setUser,
    error,
    loading,
    isAdmin,
    randomSeed,
    userBookmarks,
    userNotifications: userNotifications?.badgeCount || null,
    timelineCursor,
    setTimelineCursor,
    signOut,
    showAddAccountModal: modal.openModal,
    handleUserAuth,
    resetNotifications,
    lastCheckedNotifications
  };

  return (
    <AuthContext.Provider value={value}>
      <>
        <WarpcastSignInModal {...modal}></WarpcastSignInModal>
      </>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContext {
  const context = useContext(AuthContext);

  if (!context)
    throw new Error('useAuth must be used within an AuthContextProvider');

  return context;
}
