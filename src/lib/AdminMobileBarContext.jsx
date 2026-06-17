import { createContext, useContext, useState, useCallback } from 'react';

const AdminMobileBarContext = createContext({
  mobileAction: null,
  setMobileAction: () => {},
});

export function AdminMobileBarProvider({ children }) {
  const [mobileAction, setMobileActionState] = useState(null);
  const setMobileAction = useCallback((v) => setMobileActionState(v), []);

  return (
    <AdminMobileBarContext.Provider value={{ mobileAction, setMobileAction }}>
      {children}
    </AdminMobileBarContext.Provider>
  );
}

export const useAdminMobileBar = () => useContext(AdminMobileBarContext);
