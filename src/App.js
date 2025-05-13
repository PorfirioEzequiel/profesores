import React, { useState } from 'react';
import supabase from './servicios/client';
import jsPDF from 'jspdf';

function App() {
  const [curp, setCurp] = useState("");
  const [nombre, setNombre] = useState("");
  const [plantel, setPlantel] = useState("");
  const [acompanate, setAcompanate] = useState("");
  const [cct, setCct] = useState("");
  const [nivel, setNivel] = useState("");
  const [serie, setSerie] = useState("");

  const CURP_REGEX = /^[A-Z]{1}[AEIOUX]{1}[A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM]{1}[A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]{1}\d{1}$/;

  const generarPDF = (folio) => {
  const doc = new jsPDF();
  
  // Logo (si tienes uno)
  // doc.addImage(logo, 'JPEG', 10, 10, 50, 25);
  
  doc.setFontSize(16);
  doc.setTextColor(40);
  doc.text("REGISTRO DE PROFESOR", 105, 20, null, null, 'center');
  
  doc.setFontSize(12);
  doc.text(`Folio: ${folio}`, 15, 30);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 150, 30);
  
  // Datos en formato tabla
  const yStart = 50;
  const lineHeight = 8;
  
  doc.text(`Nombre: ${nombre}`, 15, yStart);
  doc.text(`CURP: ${curp}`, 15, yStart + lineHeight);
  doc.text(`Plantel: ${plantel}`, 15, yStart + lineHeight*2);
  doc.text(`CCT: ${cct}`, 15, yStart + lineHeight*3);
  doc.text(`Nivel: ${nivel}`, 15, yStart + lineHeight*4);
  doc.text(`Acompañante: ${acompanate || 'Ninguno'}`, 15, yStart + lineHeight*5);
  
  doc.save(`registro_${folio}.pdf`);
};

  const handleRegister = async () => {
  if (!CURP_REGEX.test(curp)) {
    alert("El CURP ingresado no es válido. Verifica que tenga el formato correcto.");
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from("profesores")
      .insert({
        curp: curp,
        nombre: nombre,
        plantel: plantel,
        acompanate: acompanate,
        cct: cct,
        nivel: nivel,
        serie: serie
      })
      .select(); // Añade esto para obtener el registro insertado

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
      setCurp("");
      setNombre("");
      setPlantel("");
      setAcompanate("");
      setCct("");
      setNivel("");
      setSerie("");
      
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
        <div>
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="last-name" className="block text-sm/6 font-semibold text-gray-900">
                CURP:
              </label>
              <div className="mt-2.5">
                <input 
                  type="text"
                  placeholder="CURP"
                  value={curp}
                  onChange={(e) => setCurp(e.target.value.trim().toUpperCase())}
                  className='block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-rose-600'
                  required
                />
              </div>
            </div>
            
            <div className="sm:col-span-2">
              <label htmlFor="email" className="block text-sm/6 font-semibold text-gray-900">
                NOMBRE:
              </label>
              <div className="mt-2.5">
                <input
                  type="text"
                  placeholder="NOMBRE COMPLETO"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value.toUpperCase())}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-purple-600"
                  required
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="email" className="block text-sm/6 font-semibold text-gray-900">
                PLANTEL:
              </label>
              <div className="mt-2.5">
                <input
                  type="text"
                  placeholder="NOMBRE DEL PLANTEL"
                  value={plantel}
                  onChange={(e) => setPlantel(e.target.value.toUpperCase())}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-purple-600"
                  required
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="email" className="block text-sm/6 font-semibold text-gray-900">
                ACOMPAÑANTE:
              </label>
              <div className="mt-2.5">
                <input
                  type="text"
                  placeholder="NOMBRE DEL ACOMPAÑANTE (OPCIONAL)"
                  value={acompanate}
                  onChange={(e) => setAcompanate(e.target.value.toUpperCase())}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-purple-600"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="email" className="block text-sm/6 font-semibold text-gray-900">
                CCT:
              </label>
              <div className="mt-2.5">
                <input
                  type="text"
                  placeholder="CLAVE DEL CENTRO DE TRABAJO"
                  value={cct}
                  onChange={(e) => setCct(e.target.value.toUpperCase())}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-purple-600"
                  required
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="nivel" className="block text-sm/6 font-semibold text-gray-900">
                NIVEL EDUCATIVO
              </label>
              <div className="mt-2.5">
                <select
                  id="nivel"
                  name="nivel"
                  value={nivel}
                  onChange={(e) => setNivel(e.target.value.toUpperCase())}
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
              className="block w-full rounded-md bg-rose-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-xs hover:bg-rose-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
              onClick={handleRegister}
            >
              REGISTRAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;