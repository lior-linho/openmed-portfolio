# OpenMed Sandbox MVP

A research-oriented tool for coronary intervention simulation, supporting fluoroscopy, cine imaging, dose calculation, and experimental data export.

## 🚀 Latest Release v0.4.0

### ✨ Core Features

#### Fluoroscopy Simulation
- Real-time X-ray fluoroscopy
- Time-integrated dose accumulation model
- Clinical angle presets (AP, LAO30/CRA20, RAO30/CAU20, etc.)
- Zoom and collimation control

#### Data Logging
- Path length measurement
- Contrast agent usage statistics
- Dose index calculation
- Lesion coverage analysis

#### Experiment Export
- JSON format (full parameters and metadata)
- CSV format (with experimental context)
- Parameter fingerprint and run ID
- Standardized citation-ready records

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **3D Rendering**: Three.js + React Three Fiber
- **State Management**: Zustand
- **Build Tool**: Vite

## 📦 Installation & Run

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎮 User Guide

### Basic Workflow
1. Select an angle preset or adjust manually
2. Adjust zoom and collimation settings
3. Control fluoroscopy using mouse or keyboard
4. Record experimental data
5. Export results for analysis

### Keyboard Shortcuts
- **F**: Start fluoroscopy (hold)
- **C**: Start cine (3 seconds)
- **空格**: Single exposure
- **ESC**: Stop fluoroscopy

### Data Export
- **JSON**: Complete experimental data with parameters and metadata
- **CSV**: Tabular format for statistical analysis

## 📊 Version History

### v0.4.0 (Current)
- ✅ Time-integrated dose model
- ✅ Global stop conditions
- ✅ Zoom and collimation controls
- ✅ Keyboard shortcuts
- ✅ Stable parameter fingerprinting
- ✅ Production-mode optimizations

### v0.3.0
- Improved research reproducibility
- Dose model refinements
- Auditable export pipeline

### v0.2.0
- MVP core functionality
- 3D/2D dual-view system
- Basic interaction model

## 🔬 Research Applications

### Reproducibility
- Fixed random seeds
- Parameter hash tracking
- Complete experimental records

### Clinical Relevance
- Realistic dose modeling
- Clinically used angle presets
- Medical metric computation

### Data Quality
- Stable numerical algorithms
- Robust boundary handling
- Accurate measurement tools

## 📝 Usage Notes

### Interface Layout
- **Left**: 3D backstage view
- **Right**: Data panel + 2D angiography main view
- **Control Bar**: Angle, zoom, collimation, and operation controls

### Procedural Workflow
1. **Cross**: Guidewire crosses the lesion
2. **Pre-dilate**: Pre-dilation
3. **Deploy**: Stent deployment
4. **Post-dilate**: Post-dilation

## 🤝 Contributing

Issues and Pull Requests are welcome!

## 📄 License

MIT License

## 📞 Contact

For questions or suggestions, please contact us via GitHub Issues.

---

**OpenMed Sandbox v0.4.0** - A streamlined and efficient research tool ✨