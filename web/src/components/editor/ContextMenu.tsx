import React, { useEffect, useRef } from 'react';

interface ContextMenuItem {
  id: string;
  label: string;
  onClick: () => void;
}

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  items,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          onClose();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-card border border-primary/20 rounded-xl shadow-lg py-1"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '100px',
      }}
      onMouseLeave={onClose}
    >
      {items.map((item) => (
        <button
          key={item.id}
          className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 transition-colors"
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};
