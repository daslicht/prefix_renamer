const fs = require("fs");
const path = require("path");
//require('nw.gui').Window.get().showDevTools();
const Sortable = require('sortablejs');

class PrefixManager 
{
  constructor(appPath, containerId, removeZoneId) 
  {
    this.configPath = path.join(appPath, "config.json");
    this.container = document.getElementById(containerId);
    this.removeZoneContainer = document.getElementById(removeZoneId);
    this.config = { prefixes: [] };

    this.input = document.createElement("input");
    this.addBtn = document.createElement("button");
  }


  init() 
  {
    this.loadConfig();
    this.renderInput();
    this.renderZones();
    this.renderRemoveZone();
    this.setupSortableJS();
  }


  setupSortableJS()
  {
    Sortable.create(this.container, 
    {
        animation: 150,
        ghostClass: "sortable-ghost",
        onEnd: (evt) => 
        {
            const newOrder = Array.from(this.container.children)
              .map((el) => el.getAttribute("data-prefix"))
              .filter(Boolean); // skip elements like whitespace or empty divs
          
            this.config.prefixes = newOrder;
            this.saveConfig();
            console.log("✅ Saved new order:", newOrder);
        }
    });
  }


  loadConfig() 
  {
    if (fs.existsSync(this.configPath)) {
      this.config = JSON.parse(fs.readFileSync(this.configPath));
    } else {
      this.config.prefixes = ["SN", "BD", "FX"];
      this.saveConfig();
    }
  }


  saveConfig() 
  {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }


  renderInput() 
  {
    this.input.placeholder      = "New prefix (e.g., VOX)";
    this.input.name             = "new_prefix_input";
    this.input.style.margin     = "10px";
    this.addBtn.textContent     = "➕ Add";

    this.addBtn.onclick = () => 
    {
      this.addPrefix(this.input.value.trim().toUpperCase());
      this.input.value = "";
    };

    document.body.appendChild(this.input);
    document.body.appendChild(this.addBtn);
  }


  addPrefix(prefix) 
  {
    if (!prefix || this.config.prefixes.includes(prefix)) return;
    this.config.prefixes.push(prefix);
    this.saveConfig();
    this.renderZones();
  }


  renderZones() 
  {
    this.container.innerHTML = "";
    this.config.prefixes.forEach((prefix) => 
    {
      const zone       = document.createElement("div");
      zone.className   = "dropzone";
      zone.textContent = `${prefix}`;
      zone.setAttribute("data-prefix", prefix);

      const delBtn       = document.createElement("button");
      delBtn.textContent = "✕";
      delBtn.style.float = "right";

      delBtn.onclick = () => 
      {
        this.config.prefixes = this.config.prefixes.filter((p) => p !== prefix);
        this.saveConfig();
        this.renderZones();
      };
      zone.appendChild(delBtn);

      zone.addEventListener("dragover", (e) => 
      {
        e.preventDefault();
        zone.classList.add("active");
      });
      zone.addEventListener("dragleave", () => zone.classList.remove("active"));
      zone.addEventListener("drop", (e) => this.handleDrop(e, prefix));

      this.container.appendChild(zone);
    });
  }


  handleDrop(e, prefix) 
  {
    e.preventDefault();
    e.target.classList.remove("active");

    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => {
      const filePath = file.path;
      const dir = path.dirname(filePath);
      const base = path.basename(filePath);
      const existing = this.config.prefixes.find((p) => base.startsWith(p + "_"));

      let cleanName = existing ? base.replace(existing + "_", "") : base;
      const newName = `${prefix}_${cleanName}`;
      const newPath = path.join(dir, newName);

      if (fs.existsSync(newPath)) {
        alert(`File already exists: ${newName}`);
        return;
      }

      fs.rename(filePath, newPath, (err) => {
        if (err) {
          alert(`Error renaming: ${err.message}`);
        } else {
          console.log(`✔ ${base} → ${newName}`);
        }
      });
    });
  }


  renderRemoveZone() 
  {
    const removeZone = document.createElement("div");
    removeZone.className = "dropzone";
    removeZone.textContent = "⛔ Remove Prefix";

    removeZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      removeZone.classList.add("active");
    });
    removeZone.addEventListener("dragleave", () => removeZone.classList.remove("active"));
    removeZone.addEventListener("drop", (e) => this.handleRemoveDrop(e));

    this.removeZoneContainer.appendChild(removeZone);
  }


  handleRemoveDrop(e) 
  {
    e.preventDefault();
    e.target.classList.remove("active");

    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => {
      const filePath = file.path;
      const dir = path.dirname(filePath);
      const base = path.basename(filePath);

      const existing = this.config.prefixes.find((p) => base.startsWith(p + "_"));
      if (!existing) {
        console.log(`❌ No prefix found on: ${base}`);
        return;
      }

      const cleanName = base.replace(existing + "_", "");
      const newPath = path.join(dir, cleanName);

      if (fs.existsSync(newPath)) {
        alert(`File already exists: ${cleanName}`);
        return;
      }

      fs.rename(filePath, newPath, (err) => {
        if (err) {
          alert(`Error removing prefix: ${err.message}`);
        } else {
          console.log(`🧽 Removed: ${base} → ${cleanName}`);
        }
      });
    });
  }


}

// Start
const prefixManager = new PrefixManager(nw.__dirname, "zones", "remove_prefix_container");
prefixManager.init();
