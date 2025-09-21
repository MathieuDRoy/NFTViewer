const ALCHEMY_KEY = "t3imt2oGKV9JZ8Ez7sS8s";
const WALLET = "0x6eeEB2b5e7744BB10b5B02334D5f7E187af391Bb";
const WALLETCONNECT_PROJECT_ID = "ae733e2ad1374b740d09783c00d9b1c4";

const walletInput = document.getElementById("wallet-input");
const useAddressBtn = document.getElementById("use-address-btn");
const connectBtn = document.getElementById("connect-btn");
const disconnectBtn = document.getElementById("disconnect-btn");
const statusDiv = document.getElementById("status");
const searchBar = document.getElementById("search-bar");
const CHAIN_MAP = {
  eth: "eth-mainnet",
  polygon: "polygon-mainnet",
  abstract: "abstract-mainnet"
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7).normalize();
scene.add(dirLight);

// Gallery room
const floor = new THREE.Mesh(new THREE.PlaneGeometry(50,50), new THREE.MeshPhongMaterial({color:0x444444}));
floor.rotation.x = -Math.PI/2; scene.add(floor);
const wallMat = new THREE.MeshPhongMaterial({color:0x888888, side:THREE.DoubleSide});
const backWall = new THREE.Mesh(new THREE.PlaneGeometry(50,20), wallMat);
backWall.position.set(0,10,-25); scene.add(backWall);
const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(50,20), wallMat);
leftWall.rotation.y = Math.PI/2; leftWall.position.set(-25,10,0); scene.add(leftWall);
const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(50,20), wallMat);
rightWall.rotation.y = -Math.PI/2; rightWall.position.set(25,10,0); scene.add(rightWall);

// Controls
// const controls = new PointerLockControls(camera, document.body);
// document.body.addEventListener('click', () => controls.lock());
camera.position.set(0, 2, 5);
const keys = {};
document.addEventListener("keydown", e => keys[e.code]=true);
document.addEventListener("keyup", e => keys[e.code]=false);
function move(delta) {
  const speed = 10 * delta;
  if(keys["KeyW"]) controls.moveForward(speed);
  if(keys["KeyS"]) controls.moveForward(-speed);
  if(keys["KeyA"]) controls.moveRight(-speed);
  if(keys["KeyD"]) controls.moveRight(speed);
}

// --- Web3Modal v1 setup ---
  const providerOptions = {
    walletconnect: {
      package: window.WalletConnectProvider.default,
      options: {
        infuraId: null,
        rpc: {
          1: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
        },
        projectId: WALLETCONNECT_PROJECT_ID
      }
    }
  };

  const web3Modal = new window.Web3Modal.default({
    cacheProvider: false,
    providerOptions
  });

  let provider;
  let web3;

  async function connectWallet() {
    try {
      provider = await web3Modal.connect();
      web3 = new Web3(provider);
      const accounts = await web3.eth.getAccounts();
      currentWallet = accounts[0];
      statusDiv.textContent = `Connected: ${shorten(currentWallet)}`;
      connectBtn.style.display = "none";
      disconnectBtn.style.display = "inline-block";
      walletInput.value = currentWallet;
      searchBar.style.visibility = 'visible';
      fetchNFTs(currentWallet);
    } catch (err) {
      console.error("Web3Modal connect error:", err);
    }
  }

  async function disconnectWallet() {
    if (provider && provider.disconnect) {
      await provider.disconnect();
    }
    provider = null;
    web3 = null;
    connectBtn.style.display = "inline-block";
    disconnectBtn.style.display = "none";
    statusDiv.textContent = "Not connected";
    searchBar.style.visibility = 'hidden';
  }

  function shorten(addr){
    return addr ? addr.slice(0,6)+"…"+addr.slice(-4) : "";
  }

// Hover
const raycaster = new THREE.Raycaster();
const infoBox = document.getElementById("info");
let nftMeshes = [];

async function getNFTsByChain(chain, wallet) {
  //const url = `https://${chain}.g.alchemy.com/nft/v2/${ALCHEMY_KEY}/getNFTs?owner=${wallet}`;
  const url = `https://${chain}.g.alchemy.com/v2/${ALCHEMY_KEY}/getNFTs/?owner=${wallet}`;
  const resp = await fetch(url);
  const data = await resp.json();
  return data.ownedNfts || [];
}

async function fetchNFTs(wallet) {
  nftMeshes.forEach(m => scene.remove(m));
  nftMeshes = [];
  let nfts = [];

  if(document.getElementById("eth-toggle").checked)
    nfts = nfts.concat(await getNFTsByChain(CHAIN_MAP.eth, wallet));
  if(document.getElementById("ply-toggle").checked)
    nfts = nfts.concat(await getNFTsByChain(CHAIN_MAP.polygon, wallet));
  if(document.getElementById("abs-toggle").checked)
    nfts = nfts.concat(await getNFTsByChain(CHAIN_MAP.abstract, wallet));

  placeNFTs(nfts.slice(0, 15)); // limit for performance
}

function placeNFTs(nfts) {
  const texLoader = new THREE.TextureLoader();
  const frameMat = new THREE.MeshPhongMaterial({color:0x222222});
  let x = -20, y = 5, z = -24;

  nfts.forEach(nft => {
    //let media = nft.media?.[0]?.gateway || nft.tokenUri?.gateway;
    //if(!media) return;
    let media;
    let animatedNFT = false;
    if(nft.metadata?.animation_url) {
      if(nft.metadata?.animation_url == nft.metadata?.image) {
        media = nft.metadata?.image
      } else {
        media = nft.metadata?.animation_url
        animatedNFT = true;
      }
    }
    else {
      media = nft.media?.[0]?.gateway || nft.tokenUri?.gateway || nft.media?.[0]?.raw;
    }
    if(!media|| media === "") return;
    if(nft.contractMetadata?.openSea?.safelistRequestStatus != "verified") return;
    if(nft.error) return;
    // if(nft.spamInfo.isSpam == "true") return;
    if(media.startsWith("ipfs://")) media = media.replace(/^ipfs:\/\//,"https://ipfs.io/ipfs/");

    texLoader.load(media, tex => {
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(6,6),
        new THREE.MeshBasicMaterial({map: tex})
      );
      plane.position.set(x,y,z);
      scene.add(plane);

      const frame = new THREE.Mesh(new THREE.PlaneGeometry(6.2,6.2), frameMat);
      frame.position.set(x,y,z-0.01);
      scene.add(frame);

      plane.userData = {
        title: nft.title,
        desc: nft.description || "",
        traits: nft.metadata?.attributes || []
      };

      nftMeshes.push(plane);
      x += 8;
      if(x > 20){ x = -20; y += 8; }
    });
  });
}

// Animate
let prev = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now(); const delta = (now-prev)/1000; prev = now;
  move(delta);

  raycaster.setFromCamera({x:0,y:0}, camera);
  const intersects = raycaster.intersectObjects(nftMeshes);
  if(intersects.length>0){
    const nft = intersects[0].object.userData;
    infoBox.style.display = "block";
    infoBox.innerHTML = `<b>${nft.title}</b><br>${nft.desc}<br>
      ${nft.traits.map(t=>`${t.trait_type}: ${t.value}`).join(", ")}`;
  } else {
    infoBox.style.display = "none";
  }

  renderer.render(scene,camera);
}

// --- Event listeners ---
connectBtn.addEventListener("click", connectWallet);
disconnectBtn.addEventListener("click", disconnectWallet);
useAddressBtn.addEventListener("click", () => {
  const val = walletInput.value.trim();
  if(/^0x[a-fA-F0-9]{40}$/.test(val)){
    currentWallet = val;
    searchBar.style.visibility = 'visible';
    fetchNFTs(currentWallet);
  } else {
    alert("Invalid address");
  }
});
walletInput.addEventListener("keypress", e => { if(e.key==="Enter") useAddressBtn.click(); });
//loadMoreBtn.addEventListener("click", displayBatch);
searchBar.addEventListener("input", () => {
  const q=searchBar.value.toLowerCase();
  filteredNFTs=allNFTs.filter(n=>{
    const title=n.title?.toLowerCase()||"";
    const desc=n.description?.toLowerCase()||"";
    return title.includes(q)||desc.includes(q);
  });
  container.innerHTML=""; loadedCount=0;
  displayBatch();
});

document.getElementById("table-btn").addEventListener("click", () => {
  window.location.href = "index.html";
});

fetchNFTs(WALLET);
animate();
