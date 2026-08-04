import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';

function SmartLink({ href = '', children, ...rest }) {
  if (href.startsWith('/')) {
    return <Link to={href} {...rest}>{children}</Link>;
  }
  if (href.startsWith('http')) {
    return <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>;
  }
  return <a href={href} {...rest}>{children}</a>;
}

export default function Markdown({ children, className = '' }) {
  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: SmartLink }}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
