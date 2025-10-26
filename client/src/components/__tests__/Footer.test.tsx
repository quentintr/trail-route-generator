import { render, screen } from '@testing-library/react'
import { Footer } from '../layout/Footer'

describe('Footer', () => {
  it('renders footer content', () => {
    render(<Footer />)
    
    expect(screen.getByText('C\'est la carte')).toBeInTheDocument()
    expect(screen.getByText('Générateur d\'itinéraires de randonnée')).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(<Footer />)
    
    expect(screen.getByText('Accueil')).toBeInTheDocument()
    expect(screen.getByText('Mes itinéraires')).toBeInTheDocument()
    expect(screen.getByText('À propos')).toBeInTheDocument()
  })

  it('renders legal links', () => {
    render(<Footer />)
    
    expect(screen.getByText('Mentions légales')).toBeInTheDocument()
    expect(screen.getByText('Politique de confidentialité')).toBeInTheDocument()
    expect(screen.getByText('Conditions d\'utilisation')).toBeInTheDocument()
  })

  it('renders social media links', () => {
    render(<Footer />)
    
    expect(screen.getByText('Twitter')).toBeInTheDocument()
    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByText('LinkedIn')).toBeInTheDocument()
  })

  it('renders copyright notice', () => {
    render(<Footer />)
    
    const currentYear = new Date().getFullYear()
    expect(screen.getByText(`© ${currentYear} C'est la carte. Tous droits réservés.`)).toBeInTheDocument()
  })

  it('has proper link attributes', () => {
    render(<Footer />)
    
    const homeLink = screen.getByText('Accueil').closest('a')
    expect(homeLink).toHaveAttribute('href', '/')
    
    const aboutLink = screen.getByText('À propos').closest('a')
    expect(aboutLink).toHaveAttribute('href', '/about')
  })
})
