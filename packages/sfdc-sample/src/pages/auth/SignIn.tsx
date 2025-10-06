import { useEffect, useState } from 'react';
import SignInViewPage from '@/features/auth/components/sign-in-view';

export default function SignIn() {
  const [stars, setStars] = useState(3000);

  useEffect(() => {
    fetch('https://api.github.com/repos/kiranism/next-shadcn-dashboard-starter')
      .then((response) => response.json())
      .then((data) => {
        if (data.stargazers_count) {
          setStars(data.stargazers_count);
        }
      })
      .catch(() => {
        // Error fetching GitHub stars, using default value
      });
  }, []);

  return <SignInViewPage stars={stars} />;
}
