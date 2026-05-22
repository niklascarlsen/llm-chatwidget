import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';

import ChatMain from './components/chat/ChatMain';

function App() {
  return (
    <div className='min-h-screen bg-slate-50 text-slate-900'>
      <ChatMain />
      {/* Dummy page content so scroll lock / mobile layout can be tested. */}
      <div className='h-[50vh] bg-slate-50'></div>
      <div className='h-[50vh] bg-slate-100'></div>
      <div className='h-[25vh] bg-slate-200'></div>
      <div className='h-[25vh] bg-slate-300'></div>
      <div className='h-[25vh] bg-slate-400'></div>
      <div className='h-[25vh] bg-slate-500'></div>
      <div className='h-[25vh] bg-slate-600'></div>
      <div className='h-[25vh] bg-slate-700'></div>
      <div className='h-[25vh] bg-slate-800'></div>
      <div className='h-[25vh] bg-slate-900'></div>
    </div>
  );
}

export default App;
