# GitHub Pages Personal Site

This project is prepared for a personal GitHub Pages site with GitHub login support.

## 1. Rename the folder and repository

For a personal GitHub Pages site, rename the local folder and the GitHub repository to:

`power7092.github.io`

## 2. Edit `site-config.js`

Update these values:

- `githubUsername`
- `repoName`
- `siteTitle`
- `siteUrl`
- `githubProfileUrl`
- `supabaseUrl`
- `supabaseAnonKey`

## 3. Configure GitHub login with Supabase

1. Create a Supabase project.
2. Enable the GitHub provider in Supabase Auth.
3. In the GitHub OAuth app, register the Supabase callback URL.
4. In Supabase, add your Pages URL as an additional redirect URL.
5. Put the public Supabase values into `site-config.js`.

Do not place a GitHub client secret in this repository.

## 4. Deploy

1. Push this project to the `power7092.github.io` repository.
2. In GitHub, open the repository settings for Pages.
3. Deploy from the branch root that contains `index.html`.

## Notes

- GitHub profile and public repositories are fetched from the GitHub public API.
- The Omok game remains available as a section inside the site.
