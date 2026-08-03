import Head from 'expo-router/head';

export const APP_TITLE = 'Field Atlas';

export function WebPageTitle() {
    return (
        <Head>
            <title>{APP_TITLE}</title>
        </Head>
    );
}
