import React, { useMemo } from 'react';
import { NextPage } from 'next';

import {
  ApolloProvider,
  ApolloClient,
  InMemoryCache,
  NormalizedCacheObject,
  HttpLink,
  from,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';

import { apiURL } from '../utils/api-url';
import { clearToken, getToken } from '../utils/auth';

const isServer = typeof window === 'undefined';
let apolloClient: ApolloClient<NormalizedCacheObject>;

const apolloClientCache = new InMemoryCache();

function createApolloClient() {
  const authLink = setContext((_, { headers }) => {
    const token = getToken();
    return {
      headers: {
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
  });

  const errorLink = onError(({ networkError }) => {
    const status = (networkError as { statusCode?: number })?.statusCode;
    if (status === 401 && !isServer) {
      clearToken();
      window.location.href = '/login';
    }
  });

  const httpLink = new HttpLink({
    uri: `${apiURL}/graphql`,
  });

  return new ApolloClient({
    ssrMode: isServer,
    devtools: { enabled: !isServer },
    link: from([authLink, errorLink, httpLink]),
    cache: apolloClientCache,
    queryDeduplication: true,
  });
}

export function initializeApollo(initialState: Record<string, any>) {
  const _apolloClient = apolloClient ?? createApolloClient();

  // If your page has Next.js data fetching methods that use Apollo Client, the initial state
  // gets hydrated here
  if (initialState) {
    _apolloClient.cache.restore(initialState);
  }
  // For SSG and SSR always create a new Apollo Client
  if (typeof window === 'undefined') return _apolloClient;
  // Create the Apollo Client once in the client
  if (!apolloClient) apolloClient = _apolloClient;

  return _apolloClient;
}

export function withApollo(Component: NextPage) {
  return (props: any) => {
    const pageApolloClient = useMemo(
      () => initializeApollo(props.initialApolloState),
      [props.initialApolloState]
    );
    return (
      <ApolloProvider client={pageApolloClient}>
        <Component {...props} />
      </ApolloProvider>
    );
  };
}
