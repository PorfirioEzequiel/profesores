import React, { useState, useRef } from 'react';
import supabase from './servicios/client';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

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
    tipoPersonal: "",
    municipioTrabajoResidencia: "",
    otroMunicipio: "",
    sostenimiento: ""
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

  const municipioOpciones = [
    { id: 'reside_labora_tecamac', label: 'Reside y labora como docente en el municipio de Tecámac' },
    { id: 'reside_tecamac_labora_otro', label: 'Reside en el municipio de Tecámac pero labora como docente en otro municipio' },
    { id: 'reside_otro_labora_tecamac', label: 'Reside en otro municipio pero labora como docente en el municipio de Tecámac' }
  ];

  const sostenimientoOpciones = [
    { id: 'federal', label: 'Federal' },
    { id: 'estatal', label: 'Estatal' },
    { id: 'privado', label: 'Privado' }
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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
      .from('credenciales')
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

    const generarPDF = async (folio) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Margenes del documento
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    try {
      // Cargar imagen de fondo
      const imgData = await loadImage('/comprobante.jpg');
      
      // Agregar fondo con opacidad
      doc.addImage(
        imgData, 
        'JPEG', 
        0, 
        0, 
        pageWidth, 
        pageHeight,
        undefined,
        'FAST',
        0.5 // Opacidad (0.5 = 50%)
      );
      
      // Fondo blanco semitransparente para mejorar legibilidad

      // doc.setFillColor(255, 255, 255, 0.7);
      // doc.rect(
      //   margin, 
      //   margin, 
      //   pageWidth - margin * 2, 
      //   pageHeight - margin * 2, 
      //   'F'
      // );

      // Configuración de texto
      doc.setTextColor(0, 0, 0); // Texto en negro
      doc.setFont('helvetica', 'bold');
      
      // Encabezado
      doc.setFontSize(18);
      // doc.text("REGISTRO DE PROFESOR", pageWidth / 2, margin + 15, { align: 'center' });
      
      // Folio y fecha
      doc.setFontSize(12);
      
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, pageWidth - margin - 5, margin + 25, { align: 'right' });
      
      // Línea divisoria
      // doc.setDrawColor(150);
      // doc.setLineWidth(0.5);
      // doc.line(margin, margin + 30, pageWidth - margin, margin + 30);

      // Contenido principal
      let yPosition = margin + 40;
      const lineHeight = 8;
      
      // Función para agregar texto con etiqueta
      // const addField = ( value) => {
      //   doc.setFontSize(12);
      //   doc.setFont('helvetica', 'bold');
      //   // doc.text(`${label}:`, margin + 5, yPosition);
      //   doc.setFont('helvetica', 'normal');
      //   doc.text(value || 'No especificado', margin + 40, yPosition);
      //   yPosition += lineHeight;
      // };
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      // Campos del formulario
      doc.text(formData.nombre, margin + 30, 90);
      // addField('CURP', formData.curp);
      // addField('Años de servicio', formData.anosServicio);
      // addField('Tipo de personal', formData.tipoPersonal);
      
      // Información de municipio
      // let municipioInfo = "";
      // switch(formData.municipioTrabajoResidencia) {
      //   case 'reside_labora_tecamac':
      //     municipioInfo = "Reside y labora en Tecámac";
      //     break;
      //   case 'reside_tecamac_labora_otro':
      //     municipioInfo = `Reside en Tecámac pero labora en ${formData.otroMunicipio || 'otro municipio'}`;
      //     break;
      //   case 'reside_otro_labora_tecamac':
      //     municipioInfo = `Reside en ${formData.otroMunicipio || 'otro municipio'} pero labora en Tecámac`;
      //     break;
      //   default:
      //     municipioInfo = "No especificado";
      // }
      // addField('Ubicación', municipioInfo);
      
      doc.text(formData.plantel, margin + 30, 105);
      // addField('Sostenimiento', formData.sostenimiento);
      doc.text( formData.cct, margin + 150, 105);
      doc.text(`${folio}`, margin + 25, margin + 106);
      // addField('Nivel educativo', formData.nivel);
      // doc.text(formData.acompanate || 'Ninguno');

      // Agregar imagen de credencial si existe
      // if (formData.credencial_url) {
      //   try {
      //     const credencialImg = await loadImage(formData.credencial_url);
      //     const imgWidth = 40;
      //     const imgHeight = 30;
      //     doc.addImage(
      //       credencialImg, 
      //       'JPEG', 
      //       pageWidth - margin - imgWidth - 5, 
      //       yPosition - 5, 
      //       imgWidth, 
      //       imgHeight
      //     );
      //     doc.setFontSize(10);
      //     doc.text("Credencial adjunta:", pageWidth - margin - imgWidth - 5, yPosition - 10);
      //     yPosition += imgHeight + 10;
      //   } catch (error) {
      //     console.error("Error al cargar imagen de credencial:", error);
      //   }
      // }

      let qrDataURL;
    try {
      qrDataURL = await QRCode.toDataURL(formData.curp, {
        width: 150,
        margin: 1,
        color: {
          dark: '#000000', // Puntos negros
          light: '#ffffff' // Fondo transparente
        }
      });
      
      // Agregar QR al documento (esquina superior derecha)
      const qrSize = 50; // Tamaño en mm
      doc.addImage(
        qrDataURL, 
        'PNG', 
        pageWidth - margin - qrSize - 3, 
        margin + 100, 
        qrSize, 
        qrSize
      );
      doc.setFontSize(8);
      // doc.text("CURP codificado", pageWidth - margin - qrSize/2 - 5, margin + 35 + qrSize + 5, { align: 'center' });
    } catch (qrError) {
      console.error("Error al generar QR:", qrError);
    }

      // Pie de página
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        "Documento generado automáticamente - Sistema de Registro de Profesores", 
        pageWidth / 2, 
        pageHeight - margin + 10, 
        { align: 'center' }
      );

      doc.save(`registro_${folio}.pdf`);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      // Generar PDF sin fondo si hay error
      generarPDFBasico(folio);
    }
  };

  // Versión básica sin fondo por si falla la carga de imagen
  const generarPDFBasico = (folio) => {
    const doc = new jsPDF();
    // ... (implementación básica sin fondo)
    doc.save(`registro_${folio}.pdf`);
  };

  // Función auxiliar para cargar imágenes
  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = url;
    });
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

    if (!formData.municipioTrabajoResidencia) {
      alert("Por favor seleccione una opción de residencia/laboral");
      return;
    }

    if (!formData.sostenimiento) {
      alert("Por favor seleccione el sostenimiento del plantel");
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
          municipio_trabajo_residencia: formData.municipioTrabajoResidencia,
          otro_municipio: formData.otroMunicipio,
          sostenimiento: formData.sostenimiento,
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
          tipoPersonal: "",
          municipioTrabajoResidencia: "",
          otroMunicipio: "",
          sostenimiento: ""
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
                      {tipo.label.toLocaleUpperCase()}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm/6 font-semibold text-slate-200 mb-2">
                RESIDENCIA Y LUGAR DE TRABAJO:
              </label>
              <div className="space-y-2">
                {municipioOpciones.map((opcion) => (
                  <div key={opcion.id} className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        type="radio"
                        id={opcion.id}
                        name="municipioTrabajoResidencia"
                        value={opcion.id}
                        checked={formData.municipioTrabajoResidencia === opcion.id}
                        onChange={handleRadioChange}
                        className="h-4 w-4 text-rose-600 focus:ring-rose-600"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor={opcion.id} className="text-sm/6 text-slate-200">
                        {opcion.label.toLocaleUpperCase()}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              
              {(formData.municipioTrabajoResidencia === 'reside_tecamac_labora_otro' || 
                formData.municipioTrabajoResidencia === 'reside_otro_labora_tecamac') && (
                <div className="mt-2">
                  <label htmlFor="otroMunicipio" className="block text-sm/6 font-semibold text-slate-200">
                    ESPECIFIQUE EL OTRO MUNICIPIO:
                  </label>
                  <input
                    type="text"
                    id="otroMunicipio"
                    name="otroMunicipio"
                    value={formData.otroMunicipio.toLocaleUpperCase()}
                    onChange={handleChange}
                    placeholder="Nombre del municipio"
                    className="mt-1 block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-purple-600"
                  />
                </div>
              )}
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
              <label className="block text-sm/6 font-semibold text-slate-200 mb-2">
                SOSTENIMIENTO DEL PLANTEL:
              </label>
              <div className="space-y-2">
                {sostenimientoOpciones.map((opcion) => (
                  <div key={opcion.id} className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        type="radio"
                        id={opcion.id}
                        name="sostenimiento"
                        value={opcion.id}
                        checked={formData.sostenimiento === opcion.id}
                        onChange={handleRadioChange}
                        className="h-4 w-4 text-rose-600 focus:ring-rose-600"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor={opcion.id} className="text-slate-200">
                        {opcion.label.toLocaleUpperCase()}
                      </label>
                    </div>
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
                  required
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
                  <option value="ESTANCIA">ESTANCIA</option>
                  <option value="KINDER">KINDER</option>
                  <option value="PRIMARIA">PRIMARIA</option>
                  <option value="SECUNDARIA">SECUNDARIA</option>
                  <option value="PREPARATORIA">PREPARATORIA</option>
                  <option value="UNIVERSIDAD">UNIVERSIDAD</option>
                </select>
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