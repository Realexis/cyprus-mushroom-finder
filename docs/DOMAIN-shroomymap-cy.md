# Moving the site to shroomymap.cy

> **Update, later on 26 Nov 2026:** Real set the DNS in Cloudflare (4 A records, `www` CNAME, DNS only).
> The domain file now lives in the source, `web/public/CNAME`, so every build carries it, and the robot
> stops if it is missing. `SITE` in `scripts/lab-daily.sh` is `https://shroomymap.cy/`. The custom domain
> and HTTPS are set with `gh api -X PUT repos/realexis/shroomy/pages`. The notes below are the first plan.

Written 26 Nov 2026. DNS values are from the GitHub Pages documentation, read that day:
https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
Check that page again on the day you do it.

## How the site is published today

- The robot on the Mac (`scripts/lab-daily.sh`) builds the site each day and pushes the built files
  to the project **Realexis/shroomy**, branch **gh-pages**. GitHub Pages serves that branch.
- Today's address: https://realexis.github.io/shroomy/

## What is already prepared in the code

- **Nothing in the site depends on `/shroomy/`.** All links, map files and the Greek pages use
  relative addresses (Vite `base: "./"`), so the same build works at `shroomymap.cy/`.
- **The robot keeps the CNAME file.** GitHub stores the domain in a file called `CNAME` on the
  gh-pages branch. The robot's copy step deletes files that are not in the new build, so `CNAME`
  is now on its keep list (`--exclude=CNAME`, next to README.md and .nojekyll).
- The CNAME file itself is **not** added yet, on purpose: the moment it exists, GitHub sends every
  visitor to shroomymap.cy, and the site would be unreachable until the DNS records work.

## Do by hand, in one sitting, in this order

1. **Verify the domain (recommended by GitHub, stops someone else claiming it).**
   GitHub, your profile picture, Settings, Pages, "Add a domain". It gives you one TXT record to add
   at the .cy provider.
2. **Enter the domain at GitHub.** Project Realexis/shroomy, Settings, Pages, "Custom domain":
   type `shroomymap.cy`, press Save. GitHub adds the `CNAME` file to gh-pages by itself.
3. **Add the DNS records at the .cy provider.**

   | Type | Name | Value |
   | --- | --- | --- |
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | AAAA | @ | 2606:50c0:8000::153 |
   | AAAA | @ | 2606:50c0:8001::153 |
   | AAAA | @ | 2606:50c0:8002::153 |
   | AAAA | @ | 2606:50c0:8003::153 |
   | CNAME | www | realexis.github.io |

   - The `www` record has **no** `/shroomy` at the end.
   - Remove any other A, AAAA or `www` records the provider put there, or HTTPS may not start.
   - No wildcard (`*`) record.
4. **Wait.** DNS can take up to 24 hours. A check mark appears next to the domain in Settings, Pages.
5. **Turn on "Enforce HTTPS"** in the same place, once the box can be ticked (up to 24 hours).
6. **Tell Claude Code "the domain works".** One line changes in `scripts/lab-daily.sh`
   (`SITE=https://shroomymap.cy/`), so the share picture uses the new address.

`www.shroomymap.cy` then forwards to `shroomymap.cy` by itself.

## The old address

Once the domain is saved in step 2, GitHub forwards https://realexis.github.io/shroomy/ to
shroomymap.cy. Old links and bookmarks keep working, as long as the domain stays set.
This is how GitHub Pages behaves; it is not written on the two documentation pages above, so test
one old link after the switch.
Between step 2 and the DNS working, the site cannot be reached. Do steps 2 and 3 together.
