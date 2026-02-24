import { useRef, useCallback } from 'react';

interface Poolable {
  id: number;
  active: boolean;
}

export function useObjectPool<T extends Poolable>(
  createFn: (id: number) => T,
  maxSize: number
) {
  const poolRef = useRef<T[]>([]);
  const nextIdRef = useRef(0);

  const acquire = useCallback((): T | null => {
    // Try to find an inactive object
    const inactive = poolRef.current.find(obj => !obj.active);
    if (inactive) {
      inactive.active = true;
      return inactive;
    }
    
    // Create new if under max size
    if (poolRef.current.length < maxSize) {
      const newObj = createFn(nextIdRef.current++);
      newObj.active = true;
      poolRef.current.push(newObj);
      return newObj;
    }
    
    // Pool exhausted
    return null;
  }, [createFn, maxSize]);

  const release = useCallback((obj: T) => {
    obj.active = false;
  }, []);

  const getActive = useCallback((): T[] => {
    return poolRef.current.filter(obj => obj.active);
  }, []);

  const getAll = useCallback((): T[] => {
    return poolRef.current;
  }, []);

  const clear = useCallback(() => {
    poolRef.current = [];
    nextIdRef.current = 0;
  }, []);

  return { acquire, release, getActive, getAll, clear };
}
