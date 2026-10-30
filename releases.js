// Fills in each Download button with the newest GitHub release.
//
// A button looks like:
//   <a class="btn" data-repo="Road-Editor-for-Mac" data-ext=".dmg"
//      href="https://github.com/rhiamom/Road-Editor-for-Mac/releases/latest">Download for Mac</a>
//
// The href is the fallback: if GitHub can't be reached, the button still opens
// the releases page. Repos with no release yet turn into a grey "Coming soon".
// Results are cached for an hour because GitHub allows 60 lookups per hour per visitor.

const OWNER = "rhiamom";
const CACHE_MS = 60 * 60 * 1000;

async function latestRelease(repo) {
  const key = "release:" + repo;
  try {
    const cached = JSON.parse(localStorage.getItem(key));
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;
  } catch (e) {}

  const res = await fetch(`https://api.github.com/repos/${OWNER}/${repo}/releases/latest`);
  let data;
  if (res.status === 404) data = { none: true };
  else if (res.ok) {
    const r = await res.json();
    data = {
      tag: r.tag_name,
      assets: r.assets.map(a => ({ name: a.name, url: a.browser_download_url, size: a.size })),
    };
  } else throw new Error("GitHub said " + res.status);

  try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), data })); } catch (e) {}
  return data;
}

function megabytes(bytes) {
  return Math.max(1, Math.round(bytes / 1048576)) + " MB";
}

async function fillButton(btn) {
  try {
    const rel = await latestRelease(btn.dataset.repo);
    if (rel.none) {
      btn.classList.add("soon");
      btn.textContent = "Coming soon";
      btn.removeAttribute("href");
      return;
    }
    const asset = rel.assets.find(a => a.name.toLowerCase().endsWith(btn.dataset.ext));
    if (!asset) return;
    btn.href = asset.url;
    // Prefer the version in the file name; some release tags don't match the app's version.
    const inName = asset.name.match(/\d+(?:\.\d+)+/);
    const version = inName ? inName[0] : rel.tag.replace(/^v/i, "");
    btn.insertAdjacentHTML("beforeend", ` <small>v${version} · ${megabytes(asset.size)}</small>`);
  } catch (e) {
    // Leave the fallback link to the releases page.
  }
}

document.querySelectorAll("a[data-repo]").forEach(fillButton);
