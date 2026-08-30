import { handleFaqSkill } from './skill-faq.mjs';

const ERR = {
  PARSE: { code: -32700, message: 'Parse error' },
  INVALID_REQUEST: { code: -32600, message: 'Invalid Request' },
  METHOD_NOT_FOUND: { code: -32601, message: 'Method not found' },
  INVALID_PARAMS: { code: -32602, message: 'Invalid params' },
  INTERNAL: { code: -32603, message: 'Internal error' },
  UNSUPPORTED: { code: -32004, message: 'Unsupported operation' }
};

function rpcError(id, err, data) {
  return { jsonrpc: '2.0', id: id ?? null, error: data ? { ...err, data } : err };
}

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

async function handleSendMessage(id, params) {
  const message = params && params.message;
  if (!message || !Array.isArray(message.parts)) {
    return rpcError(id, ERR.INVALID_PARAMS, 'params.message.parts is required');
  }

  const skillId = (params.metadata && params.metadata.skillId) || 'faq-knowledge';

  try {
    if (skillId === 'faq-knowledge') {
      const result = await handleFaqSkill(message);
      return rpcResult(id, result);
    }
    return rpcError(id, ERR.INVALID_PARAMS, `unknown skillId: ${skillId}`);
  } catch (e) {
    return rpcError(id, ERR.INTERNAL, String(e && e.message));
  }
}

export async function handleRpc(body) {
  if (!body || typeof body !== 'object' || body.jsonrpc !== '2.0' || typeof body.method !== 'string') {
    return rpcError(body && body.id, ERR.INVALID_REQUEST);
  }

  const { id, method, params } = body;

  switch (method) {
    case 'SendMessage':
      return handleSendMessage(id, params || {});
    case 'GetTask':
      return rpcError(id, { code: -32001, message: 'TaskNotFound' });
    case 'ListTasks':
      return rpcResult(id, { tasks: [] });
    case 'CancelTask':
      return rpcError(id, { code: -32002, message: 'TaskNotCancelable' });
    case 'SendStreamingMessage':
    case 'SubscribeToTask':
    case 'GetExtendedAgentCard':
      return rpcError(id, ERR.UNSUPPORTED);
    default:
      return rpcError(id, ERR.METHOD_NOT_FOUND);
  }
}
