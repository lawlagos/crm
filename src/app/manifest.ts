import type { MetadataRoute } from 'next';
export default function manifest():MetadataRoute.Manifest {
 return {name:'Central',short_name:'Central',description:'Suas frentes de trabalho em um só lugar.',lang:'pt-BR',start_url:'/',scope:'/',display:'standalone',background_color:'#F3F6F8',theme_color:'#146C78',icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]};
}
