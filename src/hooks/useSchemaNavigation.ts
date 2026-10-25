import { useEffect, useState } from 'react';

/** Keep the mobile list mounted while details are open so search and scroll survive Back. */
export function useSchemaNavigation(selectedSchemaName?: string) {
  const [showDetails, setShowDetails] = useState(Boolean(selectedSchemaName));
  useEffect(() => {
    if (selectedSchemaName) setShowDetails(true);
  }, [selectedSchemaName]);
  return {
    showDetails,
    openDetails: () => setShowDetails(true),
    backToList: () => setShowDetails(false),
  };
}
