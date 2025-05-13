import React, { useState, useRef } from 'react';
import supabase from './servicios/client';
import jsPDF from 'jspdf';

function App() {
  // Form state
  const [formData, setFormData] = useState({
    curp: "",
    nombre: "",
    plantel: "",
    acompanate: "",
    cct: "",
    nivel: "",
    serie: "",
    anosServicio: "",
    tipoPersonal: ""
  });

  const [credencialFile, setCredencialFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const tipos = [
    { id: 'administrativo', label: 'Administrativo' },
    { id: 'docente', label: 'Docente' },
    { id: 'directivo', label: 'Directivo' },
    { id: 'apoyo', label: 'Apoyo' },
    { id: 'otro', label: 'Otro' }
  ];

  const CURP_REGEX = /^[A-Z]{1}[AEIOUX]{1}[A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM]{1}[A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]{1}\d{1}$/;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'curp' ? value.trim().toUpperCase() : value.toUpperCase()
    }));
  };

  const handleRadioChange = (e) => {
    setFormData(prev => ({
      ...prev,
      tipoPersonal: e.target.value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCredencialFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadCredencial = async () => {
    if (!credencialFile) return null;
    
    const fileExt = credencialFile.name.split('.').pop();
    const fileName = `${formData.curp}_${Date.now()}.${fileExt}`;
    const filePath = `credenciales/${fileName}`;

    const { data, error } = await supabase.storage
      .from('credenciales') // Nombre de tu bucket en Supabase
      .upload(filePath, credencialFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: credencialFile.type,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded / progressEvent.total) * 100
          );
          setUploadProgress(progress);
        }
      });

    if (error) {
      console.error("Error uploading file:", error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('credenciales')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const generarPDF = (folio) => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text("REGISTRO DE PROFESOR", 105, 20, null, null, 'center');
    
    doc.setFontSize(12);
    doc.text(`Folio: ${folio}`, 15, 30);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 150, 30);
    
    const yStart = 50;
    const lineHeight = 8;
    
    doc.text(`Nombre: ${formData.nombre}`, 15, yStart);
    doc.text(`CURP: ${formData.curp}`, 15, yStart + lineHeight);
    doc.text(`Años de servicio: ${formData.anosServicio}`, 15, yStart + lineHeight*2);
    doc.text(`Tipo de personal: ${formData.tipoPersonal}`, 15, yStart + lineHeight*3);
    doc.text(`Plantel: ${formData.plantel}`, 15, yStart + lineHeight*4);
    doc.text(`CCT: ${formData.cct}`, 15, yStart + lineHeight*5);
    doc.text(`Nivel: ${formData.nivel}`, 15, yStart + lineHeight*6);
    doc.text(`Acompañante: ${formData.acompanate || 'Ninguno'}`, 15, yStart + lineHeight*7);
    
    doc.save(`registro_${folio}.pdf`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!CURP_REGEX.test(formData.curp)) {
      alert("El CURP ingresado no es válido. Verifica que tenga el formato correcto.");
      return;
    }

    if (!formData.tipoPersonal) {
      alert("Por favor seleccione un tipo de personal");
      return;
    }

    try {
      let credencialUrl = null;
      if (credencialFile) {
        credencialUrl = await uploadCredencial();
      }

      const { data, error } = await supabase
        .from("profesores")
        .insert({
          curp: formData.curp,
          nombre: formData.nombre,
          plantel: formData.plantel,
          acompanate: formData.acompanate,
          cct: formData.cct,
          nivel: formData.nivel,
          serie: formData.serie,
          anos_servicio: formData.anosServicio,
          tipo_personal: formData.tipoPersonal,
          credencial_url: credencialUrl
        })
        .select();

      if (error) {
        console.error("Error al registrar:", error);
        if (error.code === '23505') {
          alert("Este CURP ya está registrado");
        } else {
          alert("Error al registrar");
        }
        return;
      }

      if (data && data.length > 0) {
        const folio = `FOLIO-${String(data[0].id).padStart(5, '0')}`;
        
        // Actualizar el registro con el folio
        const { error: updateError } = await supabase
          .from("profesores")
          .update({ serie: folio })
          .eq('id', data[0].id);

        if (updateError) {
          console.error("Error al actualizar folio:", updateError);
        }

        // Generar PDF con todos los datos
        generarPDF(folio);
        
        // Limpiar formulario después de generar PDF
        setFormData({
          curp: "",
          nombre: "",
          plantel: "",
          acompanate: "",
          cct: "",
          nivel: "",
          serie: "",
          anosServicio: "",
          tipoPersonal: ""
        });
        setCredencialFile(null);
        setPreviewUrl("");
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        
        alert("Registro exitoso");
      }
    } catch (error) {
      console.error("Error inesperado:", error);
      alert("Ocurrió un error al enviar el registro.");
    }
  };

  return (
    <div className='bg-gradient-to-r from-rose-950 via-gray-200 to-rose-950 flex items-center justify-center h-auto'>
      <div className='w-[540px] bg-gradient-to-r from-rose-950 via-rose-400 to-rose-950 rounded-xl p-4 my-40'>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="curp" className="block text-sm/6 font-semibold text-slate-200">
                CURP:
              </label>
              <div className="mt-2.5">
                <input 
                  type="text"
                  id="curp"
                  name="curp"
                  placeholder="CURP"
                  value={formData.curp}
                  onChange={handleChange}
                  className='block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-rose-600'
                  required
                />
              </div>
            </div>
            
            <div className="sm:col-span-2">
              <label htmlFor="nombre" className="block text-sm/6 font-semibold text-slate-200">
                NOMBRE:
              </label>
              <div className="mt-2.5">
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  placeholder="NOMBRE COMPLETO"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-purple-600"
                  required
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="anosServicio" className="block text-sm/6 font-semibold text-slate-200">
                AÑOS DE SERVICIO:
              </label>
              <div className="mt-2.5">
                <input
                  type="text"
                  id="anosServicio"
                  name="anosServicio"
                  placeholder="AÑOS DE SERVICIO"
                  value={formData.anosServicio}
                  onChange={handleChange}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-purple-600"
                  required
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm/6 font-semibold text-slate-200 mb-2">
                TIPO DE PERSONAL:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {tipos.map((tipo) => (
                  <div key={tipo.id} className="flex items-center">
                    <input
                      type="radio"
                      id={tipo.id}
                      name="tipoPersonal"
                      value={tipo.id}
                      checked={formData.tipoPersonal === tipo.id}
                      onChange={handleRadioChange}
                      className="h-4 w-4 text-rose-600 focus:ring-rose-600"
                    />
                    <label htmlFor={tipo.id} className="ml-2 text-sm text-slate-200">
                      {tipo.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="credencial" className="block text-sm/6 font-semibold text-slate-200">
                CREDENCIAL (IMAGEN):
              </label>
              <div className="mt-2.5">
                <input
                  type="file"
                  id="credencial"
                  name="credencial"
                  accept="image/*"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="block w-full text-sm text-gray-900 bg-white rounded-md border border-gray-300 cursor-pointer focus:outline-none"
                />
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div 
                      className="bg-rose-600 h-2.5 rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
                {previewUrl && (
                  <div className="mt-2">
                    <img 
                      src={previewUrl} 
                      alt="Vista previa de credencial" 
                      className="h-32 object-contain border rounded"
                    />
                    <p className="text-xs text-slate-200 mt-1">Vista previa</p>
                  </div>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="plantel" className="block text-sm/6 font-semibold text-slate-200">
                PLANTEL:
              </label>
              <div className="mt-2.5">
                <input
                  type="text"
                  id="plantel"
                  name="plantel"
                  placeholder="NOMBRE DEL PLANTEL"
                  value={formData.plantel}
                  onChange={handleChange}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-purple-600"
                  required
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="acompanate" className="block text-sm/6 font-semibold text-slate-200">
                ACOMPAÑANTE:
              </label>
              <div className="mt-2.5">
                <input
                  type="text"
                  id="acompanate"
                  name="acompanate"
                  placeholder="NOMBRE DEL ACOMPAÑANTE (OPCIONAL)"
                  value={formData.acompanate}
                  onChange={handleChange}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-purple-600"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="cct" className="block text-sm/6 font-semibold text-slate-200">
                CCT:
              </label>
              <div className="mt-2.5">
                <input
                  type="text"
                  id="cct"
                  name="cct"
                  placeholder="CLAVE DEL CENTRO DE TRABAJO"
                  value={formData.cct}
                  onChange={handleChange}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-purple-600"
                  required
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="nivel" className="block text-sm/6 font-semibold text-slate-200">
                NIVEL EDUCATIVO
              </label>
              <div className="mt-2.5">
                <select
                  id="nivel"
                  name="nivel"
                  value={formData.nivel}
                  onChange={handleChange}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-rose-600"
                  required
                >
                  <option value="">SELECCIONE UN NIVEL</option>
                  <option value="KINDER">KINDER</option>
                  <option value="PRIMARIA">PRIMARIA</option>
                  <option value="SECUNDARIA">SECUNDARIA</option>
                  <option value="PREPARATORIA">PREPARATORIA</option>
                  <option value="UNIVERSIDAD">UNIVERSIDAD</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <button 
              type="submit"
              className="block w-full rounded-md bg-rose-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-xs hover:bg-rose-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
            >
              REGISTRAR
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;