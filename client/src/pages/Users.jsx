import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Table } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
// import other needed UI components
import { apiRequest } from '../lib/queryClient';
import { useToast } from '../hooks/use-toast';

// Helper: initial form state
const initialForm = { name: '', email: '', password: '', contact_number: '', image: '', role: 0 };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [formLoading, setFormLoading] = useState(false);
  const { toast } = useToast();

  // Add state for image file and preview for create
  const [createImageFile, setCreateImageFile] = useState(null);
  const [createImagePreview, setCreateImagePreview] = useState(null);
  // Add state for image file and preview for edit
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);

  // Fetch users
  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('GET', '/api/users');
      if (res.status === 403) {
        setError('You do not have permission to view users.');
        setUsers([]);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Error fetching users');
      toast({ title: 'Error', description: err.message || 'Error fetching users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // Initial fetch
  React.useEffect(() => { fetchUsers(); }, [toast]);

  // Handlers
  // Open Create Modal: always reset form and image state
  function openCreateModal() {
    setForm(initialForm);
    setCreateImageFile(null);
    setCreateImagePreview(null);
    setShowCreateModal(true);
    setFormLoading(false);
  }

  // Open Edit Modal: set form to selected user, reset image state
  function openEditModal(user) {
    setSelectedUser(user);
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      contact_number: user.contact_number || '',
      image: user.image || '',
      role: user.role || 0,
    });
    setEditImageFile(null);
    setEditImagePreview(null);
    setShowEditModal(true);
    setFormLoading(false);
  }
  function openDeleteModal(user) {
    setSelectedUser(user);
    setShowDeleteModal(true);
  }

  // Handle image file selection for create
  function handleCreateImageChange(e) {
    const file = e.target.files[0];
    setCreateImageFile(file);
    setCreateImagePreview(file ? URL.createObjectURL(file) : null);
  }
  // Handle image file selection for edit
  function handleEditImageChange(e) {
    const file = e.target.files[0];
    setEditImageFile(file);
    setEditImagePreview(file ? URL.createObjectURL(file) : null);
  }

  // Create user
  async function handleCreateUser(e) {
    e.preventDefault();
    setFormLoading(true);
    let imageUrl = null;
    if (createImageFile) {
      const formData = new FormData();
      formData.append("image", createImageFile);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Image upload failed");
      const data = await res.json();
      imageUrl = data.url;
    }
    try {
      const res = await apiRequest('POST', '/api/users', { ...form, image: imageUrl });
      if (!res.ok) throw new Error('Failed to create user');
      toast({ title: 'User created', variant: 'success' });
      setShowCreateModal(false);
      fetchUsers();
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Error creating user', variant: 'destructive' });
    } finally {
      setFormLoading(false);
    }
    setCreateImageFile(null);
    setCreateImagePreview(null);
  }

  // Edit user
  async function handleEditUser(e) {
    e.preventDefault();
    setFormLoading(true);
    let imageUrl = selectedUser?.image;
    if (editImageFile) {
      const formData = new FormData();
      formData.append("image", editImageFile);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Image upload failed");
      const data = await res.json();
      imageUrl = data.url;
    }
    try {
      const res = await apiRequest('PUT', `/api/users/${selectedUser.id}`, { ...form, image: imageUrl });
      if (!res.ok) throw new Error('Failed to update user');
      toast({ title: 'User updated', variant: 'success' });
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Error updating user', variant: 'destructive' });
    } finally {
      setFormLoading(false);
    }
    setEditImageFile(null);
    setEditImagePreview(null);
  }

  // Delete user
  async function handleDeleteUser() {
    setFormLoading(true);
    try {
      const res = await apiRequest('DELETE', `/api/users/${selectedUser.id}`);
      if (!res.ok) throw new Error('Failed to delete user');
      toast({ title: 'User deleted', variant: 'success' });
      setShowDeleteModal(false);
      fetchUsers();
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Error deleting user', variant: 'destructive' });
    } finally {
      setFormLoading(false);
    }
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    setForm(initialForm);
    setCreateImageFile(null);
    setCreateImagePreview(null);
    setFormLoading(false);
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditImageFile(null);
    setEditImagePreview(null);
    setFormLoading(false);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Back Button */}
      <div className="mb-6">
        <Link 
          to="/management" 
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to System Management
        </Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button onClick={openCreateModal} className="px-4 py-2">Add User</Button>
      </div>
      <div className="overflow-x-auto rounded shadow bg-white">
        <Table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="text-center text-red-500 py-8">{error}</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8">No users found.</td></tr>
            ) : (
              users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{user.image ? <img src={user.image} alt="avatar" className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">{user.name?.[0]}</div>}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.role === 1 || user.role === '1' ? 'Admin' : 'User'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.contact_number || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditModal(user)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => openDeleteModal(user)}>Delete</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
      {/* Create User Modal */}
      <Dialog open={showCreateModal} onOpenChange={closeCreateModal}>
        <DialogContent className="max-w-md w-full p-6 rounded shadow-lg bg-white">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Fill in the details to create a new user.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateUser}>
            <input className="w-full border p-2 rounded" placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <input className="w-full border p-2 rounded" placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            <input className="w-full border p-2 rounded" placeholder="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            <input className="w-full border p-2 rounded" placeholder="Contact Number" value={form.contact_number} onChange={e => setForm(f => ({ ...f, contact_number: e.target.value }))} />
            <input type="file" accept="image/*" onChange={handleCreateImageChange} />
            {createImagePreview && <img src={createImagePreview} alt="Preview" className="w-full h-24 object-cover rounded-md my-2" />}
            <select className="w-full border p-2 rounded" value={form.role} onChange={e => setForm(f => ({ ...f, role: Number(e.target.value) }))} required>
              <option value={0}>User</option>
              <option value={1}>Admin</option>
            </select>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={closeCreateModal}>Cancel</Button>
              <Button type="submit" disabled={formLoading}>{formLoading ? 'Creating...' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={closeEditModal}>
        <DialogContent className="max-w-md w-full p-6 rounded shadow-lg bg-white">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Fill in the details to edit the user.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEditUser}>
            <input className="w-full border p-2 rounded" placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <input className="w-full border p-2 rounded" placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            <input className="w-full border p-2 rounded" placeholder="Password (leave blank to keep)" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <input className="w-full border p-2 rounded" placeholder="Contact Number" value={form.contact_number} onChange={e => setForm(f => ({ ...f, contact_number: e.target.value }))} />
            <input type="file" accept="image/*" onChange={handleEditImageChange} />
            {editImagePreview ? <img src={editImagePreview} alt="Preview" className="w-full h-24 object-cover rounded-md my-2" /> : selectedUser?.image && <img src={selectedUser.image} alt="Current" className="w-full h-24 object-cover rounded-md my-2" />}
            <select className="w-full border p-2 rounded" value={form.role} onChange={e => setForm(f => ({ ...f, role: Number(e.target.value) }))} required>
              <option value={0}>User</option>
              <option value={1}>Admin</option>
            </select>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={closeEditModal}>Cancel</Button>
              <Button type="submit" disabled={formLoading}>{formLoading ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Delete User Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-sm w-full p-6 rounded shadow-lg bg-white">
          <h2 className="text-xl font-bold mb-4">Delete User</h2>
          <p>Are you sure you want to delete <span className="font-semibold">{selectedUser?.name}</span>?</p>
          <div className="flex gap-2 justify-end mt-6">
            <Button type="button" variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleDeleteUser} disabled={formLoading}>{formLoading ? 'Deleting...' : 'Delete'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 