import { useCallback, useState } from "react";

export const useTeamworkExpand = (onFirstExpand) => {
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());
  const [descExpandedKeys, setDescExpandedKeys] = useState(() => new Set());

  const toggleExpanded = useCallback(
    (instanceKey, taskId) => {
      setExpandedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(instanceKey)) {
          next.delete(instanceKey);
        } else {
          next.add(instanceKey);
          onFirstExpand?.(taskId);
        }
        return next;
      });
    },
    [onFirstExpand],
  );

  const toggleDescExpanded = useCallback((instanceKey) => {
    setDescExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(instanceKey)) next.delete(instanceKey);
      else next.add(instanceKey);
      return next;
    });
  }, []);

  return {
    expandedKeys,
    descExpandedKeys,
    toggleExpanded,
    toggleDescExpanded,
  };
};
