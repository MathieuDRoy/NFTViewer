(function(){
  const ALCHEMY_KEY = "t3imt2oGKV9JZ8Ez7sS8s";
  const WALLETCONNECT_PROJECT_ID = "ae733e2ad1374b740d09783c00d9b1c4";
  const DEFAULT_WALLET = ""; //"0x6eeEB2b5e7744BB10b5B02334D5f7E187af391Bb";
  const BATCH_SIZE = 20;

  let allNFTs = [];
  let ETHallNFTs = [];
  let PLYallNFTs = [];
  let ABSallNFTs = [];
  let filteredNFTs = [];
  let loadedCount = 0;
  let currentWallet = DEFAULT_WALLET;
  let ntwTgls = document.querySelectorAll('.slider')

  const walletInput = document.getElementById("wallet-input");
  const useAddressBtn = document.getElementById("use-address-btn");
  const connectBtn = document.getElementById("connect-btn");
  const disconnectBtn = document.getElementById("disconnect-btn");
  const statusDiv = document.getElementById("status");
  const searchBar = document.getElementById("search-bar");
  const container = document.getElementById("nft-container");
  const loadMoreBtn = document.getElementById("load-more");
  const spinner = document.getElementById("spinner");
  const ethNwTgl = document.getElementById("eth-toggle");
  const plyNwTgl = document.getElementById("ply-toggle");
  const absNwTgl = document.getElementById("abs-toggle");  

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

  async function fetchNFTs(wallet){
    container.innerHTML="";
    spinner.style.display="block";
    loadMoreBtn.style.display="none";
    allNFTs=[]; filteredNFTs=[]; loadedCount=0;
    ETHallNFTs = []; PLYallNFTs = []; ABSallNFTs = [];
    try {
      const urlETH = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}/getNFTs/?owner=${wallet}`;
      const urlPLY = `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}/getNFTs/?owner=${wallet}`;
      const urlABS = `https://abstract-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}/getNFTs/?owner=${wallet}`;
      if(ethNwTgl.checked == true){
        const ETHres = await fetch(urlETH);
        const ETHdata = await ETHres.json();
        ETHallNFTs = ETHdata.ownedNfts || []; 
      }    
      
      if(plyNwTgl.checked == true){
        const PLYres = await fetch(urlPLY);
        const PLYdata = await PLYres.json();
        PLYallNFTs = PLYdata.ownedNfts || [];  
      }    
      
      if(absNwTgl.checked == true){
        const ABSres = await fetch(urlABS);
        const ABSdata = await ABSres.json();
        ABSallNFTs = ABSdata.ownedNfts || [];
      }
      allNFTs = ETHallNFTs.concat(PLYallNFTs).concat(ABSallNFTs);
      // const url=`https://eth-mainnet.g.alchemy.com/nft/v2/${ALCHEMY_KEY}/getNFTs?owner=${wallet}`;
      // const resp=await fetch(url);
      // const data=await resp.json();
      // allNFTs=data.ownedNfts||[];
      filteredNFTs=[...allNFTs];
      spinner.style.display="none";
      displayBatch();
    } catch(e){
      console.error("Fetch NFTs error:",e);
      spinner.style.display="none";
    }
  }

  function displayBatch(){
    const slice=filteredNFTs.slice(loadedCount,loadedCount+BATCH_SIZE);
    slice.forEach(n=>displayNFT(n,container));
    loadedCount+=slice.length;
    if(loadedCount<filteredNFTs.length) loadMoreBtn.style.display="block";
    else loadMoreBtn.style.display="none";
  }

  function displayNFT(nft, containerEl){
    //let media = nft.metadata?.animation_url || nft.media?.[0]?.gateway || nft.tokenUri?.gateway || nft.media?.[0]?.raw;
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
    if(media.startsWith("ipfs://")) media=media.replace(/^ipfs:\/\//,"https://ipfs.io/ipfs/");

    const title = nft.title || `${nft.contract?.address} #${parseInt(nft.id?.tokenId||"0",16)}`;
    const description = nft.description || nft.metadata?.description || "";
    const traits = nft.metadata?.attributes ? nft.metadata.attributes.map(a=>`${a.trait_type}: ${a.value}`).join(", ") : "";

    const tokenIdHex = nft.id?.tokenId;
    const tokenIdDec = parseInt(tokenIdHex || "0", 16);
    const contractAddr = nft.contract?.address;
    const openseaUrl = `https://opensea.io/assets/ethereum/${contractAddr}/${tokenIdDec}`;
    const etherscanUrl = `https://etherscan.io/token/${contractAddr}?a=${tokenIdDec}`;

    const card=document.createElement("div");
    card.className="nft";

    const t=document.createElement("div"); t.className="title"; t.textContent=title; card.appendChild(t);
    if(description){ const d=document.createElement("div"); d.className="description"; d.textContent=description; card.appendChild(d); }
    if(traits){ const tr=document.createElement("div"); tr.className="traits"; tr.textContent=traits; card.appendChild(tr); }

    const lower=media.split("?")[0].toLowerCase();
    if(lower.endsWith(".mp4")||lower.endsWith(".webm")){
      const vid=document.createElement("video"); vid.src=media; vid.autoplay=vid.loop=vid.muted=true; vid.controls=false; vid.playsInline=true; card.appendChild(vid);
    }
    else if(lower.endsWith(".svg")){
      const img=document.createElement("img"); img.src=media; img.alt=title; card.appendChild(img);
    }
    // else if(lower.endsWith(".glb")||lower.endsWith(".gltf")){
    //   const canvasW=260, canvasH=260;
    //   const scene=new THREE.Scene();
    //   const camera=new THREE.PerspectiveCamera(50,canvasW/canvasH,0.1,1000);
    //   const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    //   renderer.setSize(canvasW,canvasH); card.appendChild(renderer.domElement);
    //   const light=new THREE.DirectionalLight(0xffffff,1); light.position.set(5,5,5).normalize(); scene.add(light);
    //   scene.add(new THREE.AmbientLight(0xffffff,0.6));
    //   const controls=new THREE.OrbitControls(camera,renderer.domElement);
    //   controls.enableDamping=true; controls.dampingFactor=0.05;
    //   new THREE.GLTFLoader().load(media,gltf=>{
    //     const model=gltf.scene; scene.add(model);
    //     const box=new THREE.Box3().setFromObject(model); const size=new THREE.Vector3(); box.getSize(size);
    //     const scale=1/Math.max(size.x,size.y,size.z); model.scale.setScalar(scale); camera.position.z=2;
    //     (function animate(){ requestAnimationFrame(animate); controls.update(); renderer.render(scene,camera); })();
    //   },undefined,err=>console.warn("GLTF load error:",err));
    // }
    else {
      //const img=document.createElement("img"); img.src=media; img.alt=title; card.appendChild(img);
      if(animatedNFT) {
        const vid=document.createElement("video"); 
        const vidID = "vid" + title.replace(/\s+/g, '');
        vid.id = vidID;
        vid.autoplay=vid.loop=vid.muted=true;
        vid.src=media;
        vid.controls=false;
        vid.style.width="100%";
        vid.style.borderRadius="8px";
        card.appendChild(vid);
      }
      else {
        const img=document.createElement("img"); 
        img.src=media; 
        img.alt=title; 
        card.appendChild(img);
      }
    }

    const links=document.createElement("div");
    links.style.marginTop="8px";
    links.innerHTML = `
      <a href="${openseaUrl}" target="_blank" rel="noopener" style="margin-right:8px; font-size:0.8rem; text-decoration:none; color:#2f80ed;">OpenSea</a>
      <a href="${etherscanUrl}" target="_blank" rel="noopener" style="font-size:0.8rem; text-decoration:none; color:#e67e22;">Etherscan</a>
    `;
    card.appendChild(links);

    containerEl.appendChild(card);
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
  loadMoreBtn.addEventListener("click", displayBatch);
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

  document.addEventListener("DOMContentLoaded", () => {
    if(DEFAULT_WALLET){
      walletInput.value = DEFAULT_WALLET;
      fetchNFTs(DEFAULT_WALLET);
    }    
  });

  ntwTgls.forEach((tgl) => {
    addEventListener("input", () => {
      const val = walletInput.value.trim();
      if(/^0x[a-fA-F0-9]{40}$/.test(val)){
        currentWallet = val;
        fetchNFTs(currentWallet);
      } else {
        alert("Invalid address");
      }
    })
  });

  document.getElementById("gallery-btn").addEventListener("click", () => {
    window.location.href = "gallery.html";
  });


})();
