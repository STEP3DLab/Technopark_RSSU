// Local learning preferences. No identity, server, analytics, or mastery score.
export const learningKey='anatomia-learning-v1';
export function validIds(value,ids){return Array.isArray(value)?[...new Set(value.filter(id=>ids.includes(id)))]:[];}
export function createLearningState(storage,ids){
 let persistent=true,corrupt=false,state={favorites:[],ratings:{},lastOrgan:null};
 const read=key=>{try{const text=storage.getItem(key);if(!text)return {};const value=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid saved state');return value;}catch(error){if(error instanceof SyntaxError||error.message==='Invalid saved state')corrupt=true;else persistent=false;return {};}};
 const raw=read(learningKey);state.favorites=validIds(raw.favorites,ids);state.lastOrgan=ids.includes(raw.lastOrgan)?raw.lastOrgan:null;
 for(const id of ids)if(['repeat','remember'].includes(raw.ratings?.[id]))state.ratings[id]=raw.ratings[id];
 const save=()=>{try{storage.setItem(learningKey,JSON.stringify(state));persistent=true;corrupt=false;}catch{persistent=false;}};
 return {read,get:()=>({...state,favorites:[...state.favorites],ratings:{...state.ratings},persistent,corrupt}),
 toggle(id){if(!ids.includes(id))return;state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];save();},
 rate(id,value){if(!ids.includes(id)||!['repeat','remember'].includes(value))return;state.ratings[id]=value;save();},
 visit(id){if(!ids.includes(id))return;state.lastOrgan=id;save();},
 clear(){state={favorites:[],ratings:{},lastOrgan:null};save();}
 };
}
export function lessonURL(base,organ,view='explore'){
 const url=new URL(base);url.search='';url.hash='';
 url.searchParams.set('mode','cards');url.searchParams.set('lesson',['heart','lungs','kidneys'].includes(organ)?organ:'heart');
 if(view==='lesson')url.searchParams.set('view','lesson');
 return url.href;
}
