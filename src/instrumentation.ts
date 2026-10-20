export async function register(){
 if(process.env.NEXT_RUNTIME==='nodejs'&&process.env.CENTRAL_RUN_JOBS==='1'){
  const {startJobs}=await import('./server/jobs');startJobs();
 }
}
