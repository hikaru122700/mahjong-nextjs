export default function TileBack() {
  return (
    <div
      className="tile-back"
      style={{
        width: '48px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #2d5016 0%, #4a7c2c 50%, #2d5016 100%)',
        border: '2px solid #1a3a0f',
        borderRadius: '4px',
        fontSize: '32px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80%',
          height: '80%',
          border: '3px solid #6fa842',
          borderRadius: '8px',
          opacity: 0.6
        }}
      />
      <span style={{ color: '#8fbc6f', fontSize: '20px', fontWeight: 'bold', zIndex: 1 }}>裏</span>
    </div>
  );
}
