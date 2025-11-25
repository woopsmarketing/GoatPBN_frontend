import CredentialsProvider from 'next-auth/providers/credentials';

// project imports
import axios from 'utils/axios';

const users = [
  {
    id: 1,
    name: 'Jone Doe',
    email: 'info@codedthemes.com',
    password: '123456'
  }
];

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET_KEY,
  providers: [
    CredentialsProvider({
      id: 'login',
      name: 'login',
      credentials: {
        email: { name: 'email', label: 'Email', type: 'email', placeholder: 'Enter Email' },
        password: { name: 'password', label: 'Password', type: 'password', placeholder: 'Enter Password' }
      },
      async authorize(credentials) {
        try {
          const user = await axios.post('/api/account/login', {
            password: credentials?.password,
            email: credentials?.email
          });

          if (user) {
            user.data.user['accessToken'] = user.data.serviceToken;
            return user.data.user;
          }
        } catch (e) {
          const errorMessage = e?.message || e?.response?.data?.message || 'Something went wrong!';
          throw new Error(errorMessage);
        }
      }
    }),
    CredentialsProvider({
      id: 'register',
      name: 'Register',
      credentials: {
        firstname: { name: 'firstname', label: 'Firstname', type: 'text', placeholder: 'Enter Firstname' },
        lastname: { name: 'lastname', label: 'Lastname', type: 'text', placeholder: 'Enter Lastname' },
        email: { name: 'email', label: 'Email', type: 'email', placeholder: 'Enter Email' },
        company: { name: 'company', label: 'Company', type: 'text', placeholder: 'Enter Company' },
        password: { name: 'password', label: 'Password', type: 'password', placeholder: 'Enter Password' }
      },
      async authorize(credentials) {
        try {
          const user = await axios.post('/api/account/register', {
            firstName: credentials?.firstname,
            lastName: credentials?.lastname,
            company: credentials?.company,
            password: credentials?.password,
            email: credentials?.email
          });

          if (user) {
            users.push(user.data);
            return user.data;
          }
        } catch (e) {
          const errorMessage = e?.message || e?.response?.data?.message || 'Something went wrong!';
          throw new Error(errorMessage);
        }
      }
    })
  ],
  callbacks: {
    jwt: async ({ token, user, account }) => {
      if (user) {
        token.accessToken = user.accessToken;
        token.id = user.id;
        token.provider = account?.provider;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (token) {
        session.id = token.id;
        session.provider = token.provider;
        session.token = token;
      }
      return session;
    },
    async signIn(params) {
      // Prevent JWT token issuance on registration
      if (params.account?.provider === 'register') return '/';
      return true;
    },
    redirect: async ({ url, baseUrl }) => {
      // v1.1 - 커스텀 도메인 리다이렉트 강제 (2025.11.24)
      // 한글 주석: app.goatpbn.com과 같은 커스텀 도메인을 항상 사용하도록 리다이렉트 URL을 재구성
      const appBaseUrl = process.env.NEXTAUTH_URL || baseUrl;
      const normalizedBase = (() => {
        try {
          return new URL(appBaseUrl).origin;
        } catch (error) {
          console.error('커스텀 도메인 파싱 실패, 기본 baseUrl 사용:', error);
          return baseUrl;
        }
      })();

      try {
        // 내부 경로(`/dashboard`) 형태면 커스텀 도메인으로 보정
        if (url.startsWith('/')) {
          return `${normalizedBase}${url}`;
        }

        // 절대 경로일 경우, 다른 도메인이면 커스텀 도메인으로 대체
        const parsedUrl = new URL(url);
        if (parsedUrl.origin !== normalizedBase) {
          return `${normalizedBase}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
        }
        return url;
      } catch (error) {
        console.error('리다이렉트 URL 파싱 중 오류 발생:', error);
        return normalizedBase;
      }
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: Number(process.env.NEXT_APP_JWT_TIMEOUT)
  },
  jwt: {
    secret: process.env.NEXT_APP_JWT_SECRET
  },
  pages: {
    signIn: '/',
    newUser: '/register'
  }
};
